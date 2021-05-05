/* eslint-disable @typescript-eslint/no-explicit-any */
/*---------------------------------------------------------
 * Copyright 2021 The Go Authors. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

import { ChildProcess, ChildProcessWithoutNullStreams, spawn } from 'child_process';
import stream = require('stream');
import vscode = require('vscode');
import { OutputEvent, TerminatedEvent } from 'vscode-debugadapter';
import { killProcessTree } from './utils/processUtils';
import getPort = require('get-port');
import path = require('path');
import * as fs from 'fs';
import * as net from 'net';
import { getTool } from './goTools';
import { Logger, TimestampedLogger } from './goLogging';

export class GoDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
	constructor(private outputChannel?: vscode.OutputChannel) {}

	public createDebugAdapterDescriptor(
		session: vscode.DebugSession,
		executable: vscode.DebugAdapterExecutable | undefined
	): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		if (session.configuration.debugAdapter === 'dlv-dap') {
			return this.createDebugAdapterDescriptorDlvDap(session.configuration);
		}
		return executable;
	}

	public async dispose() {
		console.log('GoDebugAdapterDescriptorFactory.dispose');
	}

	private async createDebugAdapterDescriptorDlvDap(
		configuration: vscode.DebugConfiguration
	): Promise<vscode.ProviderResult<vscode.DebugAdapterDescriptor>> {
		if (configuration.port) {
			return new vscode.DebugAdapterServer(configuration.port, configuration.host ?? '127.0.0.1');
		}
		const logger = new TimestampedLogger(configuration.trace, this.outputChannel);
		const d = new DelveDAPOutputAdapter(configuration, logger);
		await d.startAndConnectToServer();
		return new vscode.DebugAdapterInlineImplementation(d);
	}
}

export class GoDebugAdapterTrackerFactory implements vscode.DebugAdapterTrackerFactory {
	constructor(private outputChannel: vscode.OutputChannel) {}

	createDebugAdapterTracker(session: vscode.DebugSession) {
		const level = session.configuration?.trace;
		if (!level || level === 'off') {
			return null;
		}
		const logger = new TimestampedLogger(session.configuration?.trace || 'off', this.outputChannel);
		return {
			onWillStartSession: () =>
				logger.debug(`session ${session.id} will start with ${JSON.stringify(session.configuration)}\n`),
			onWillReceiveMessage: (message: any) => logger.trace(`client -> ${JSON.stringify(message)}\n`),
			onDidSendMessage: (message: any) => logger.trace(`client <- ${JSON.stringify(message)}\n`),
			onError: (error: Error) => logger.error(`error: ${error}\n`),
			onWillStopSession: () => logger.debug(`session ${session.id} will stop\n`),
			onExit: (code: number | undefined, signal: string | undefined) =>
				logger.info(`debug adapter exited: (code: ${code}, signal: ${signal})\n`)
		};
	}
}

const TWO_CRLF = '\r\n\r\n';

// Proxies DebugProtocolMessage exchanges between VSCode and a remote
// process or server connected through a duplex stream, after its
// start method is called.
export class ProxyDebugAdapter implements vscode.DebugAdapter {
	private messageEmitter = new vscode.EventEmitter<vscode.DebugProtocolMessage>();
	// connection from/to server (= dlv dap)
	private readable?: stream.Readable;
	private writable?: stream.Writable;
	protected logger?: Logger;
	private terminated = false;

	constructor(logger: Logger) {
		this.logger = logger;
		this.onDidSendMessage = this.messageEmitter.event;
	}

	// Implement vscode.DebugAdapter (VSCodeDebugAdapter) interface.
	// Client will call handleMessage to send messages, and
	// listen on onDidSendMessage to receive messages.
	onDidSendMessage: vscode.Event<vscode.DebugProtocolMessage>;
	async handleMessage(message: vscode.DebugProtocolMessage): Promise<void> {
		await this.sendMessageToServer(message);
	}

	// Methods for proxying.
	protected sendMessageToClient(msg: vscode.DebugProtocolMessage) {
		this.messageEmitter.fire(msg);
	}
	protected sendMessageToServer(message: vscode.DebugProtocolMessage): void {
		const json = JSON.stringify(message) ?? '';
		if (this.writable) {
			this.writable.write(
				`Content-Length: ${Buffer.byteLength(json, 'utf8')}${TWO_CRLF}${json}`,
				'utf8',
				(err) => {
					if (err) {
						this.logger?.error(`error sending message: ${err}`);
						this.sendMessageToClient(new TerminatedEvent());
					}
				}
			);
		} else {
			this.logger?.error(`stream is closed; dropping ${json}`);
		}
	}

	public async start(readable: stream.Readable, writable: stream.Writable) {
		if (this.readable || this.writable) {
			throw new Error('start was called more than once');
		}
		this.readable = readable;
		this.writable = writable;
		this.readable.on('data', (data: Buffer) => {
			this.handleDataFromServer(data);
		});
		this.readable.once('close', () => {
			this.readable = undefined;
		});
		this.readable.on('error', (err) => {
			if (this.terminated) {
				return;
			}
			this.terminated = true;

			if (err) {
				this.logger?.error(`connection error: ${err}`);
				this.sendMessageToClient(new OutputEvent(`connection error: ${err}\n`, 'console'));
			}
			this.sendMessageToClient(new TerminatedEvent());
		});
	}

	async dispose() {
		this.writable?.end(); // no more write.
	}

	private rawData = Buffer.alloc(0);
	private contentLength = -1;
	// Implements parsing of the DAP protocol. We cannot use ProtocolClient
	// from the vscode-debugadapter package, because it's not exported and
	// is not meant for external usage.
	// See https://github.com/microsoft/vscode-debugadapter-node/issues/232
	private handleDataFromServer(data: Buffer): void {
		this.rawData = Buffer.concat([this.rawData, data]);

		// eslint-disable-next-line no-constant-condition
		while (true) {
			if (this.contentLength >= 0) {
				if (this.rawData.length >= this.contentLength) {
					const message = this.rawData.toString('utf8', 0, this.contentLength);
					this.rawData = this.rawData.slice(this.contentLength);
					this.contentLength = -1;
					if (message.length > 0) {
						const rawMessage = JSON.parse(message);
						this.sendMessageToClient(rawMessage);
					}
					continue; // there may be more complete messages to process
				}
			} else {
				const idx = this.rawData.indexOf(TWO_CRLF);
				if (idx !== -1) {
					const header = this.rawData.toString('utf8', 0, idx);
					const lines = header.split('\r\n');
					for (const line of lines) {
						const pair = line.split(/: +/);
						if (pair[0] === 'Content-Length') {
							this.contentLength = +pair[1];
						}
					}
					this.rawData = this.rawData.slice(idx + TWO_CRLF.length);
					continue;
				}
			}
			break;
		}
	}
}

// DelveDAPOutputAdapter is a ProxyDebugAdapter that proxies between
// VSCode and a dlv dap process spawned and managed by this adapter.
// It turns the process's stdout/stderrr into OutputEvent.
export class DelveDAPOutputAdapter extends ProxyDebugAdapter {
	constructor(private config: vscode.DebugConfiguration, logger?: Logger) {
		super(logger);
	}

	private dlvDapServer: ChildProcess;
	private port: number;
	private socket: net.Socket;

	protected async sendMessageToServer(message: vscode.DebugProtocolMessage): Promise<void> {
		super.sendMessageToServer(message);
	}

	async dispose(timeoutMS?: number) {
		// NOTE: OutputEvents from here may not show up in DEBUG CONSOLE
		// because the debug session is terminating.
		await super.dispose();
		if (!this.dlvDapServer) {
			return;
		}

		if (timeoutMS === undefined) {
			timeoutMS = 1_000;
		}
		const dlvDapServer = this.dlvDapServer;
		this.dlvDapServer = undefined;
		if (!dlvDapServer) {
			return;
		}
		if (dlvDapServer.exitCode !== null) {
			this.logger?.info(
				`dlv dap process(${dlvDapServer.pid}) already exited (exit code: ${dlvDapServer.exitCode})`
			);
			return;
		}
		await new Promise<void>((resolve) => {
			const exitTimeoutToken = setTimeout(() => {
				this.logger?.error(`dlv dap process (${dlvDapServer.pid}) isn't responding. Killing...`);
				dlvDapServer.kill('SIGINT'); // Don't use treekill but let dlv handle cleaning up the child processes.
				resolve();
			}, timeoutMS);
			dlvDapServer.on('exit', (code, signal) => {
				clearTimeout(exitTimeoutToken);
				if (code || signal) {
					this.logger?.error(
						`dlv dap process(${dlvDapServer.pid}) exited (exit code: ${code} signal: ${signal})`
					);
				}
				resolve();
			});
		});
	}

	public async startAndConnectToServer() {
		const { port, host, dlvDapServer } = await startDapServer(
			this.config,
			(msg) => this.outputEvent('stdout', msg),
			(msg) => this.outputEvent('stderr', msg),
			(msg) => {
				this.outputEvent('console', msg);
				// Some log messages generated after vscode stops the debug session
				// may not appear in the DEBUG CONSOLE. For easier debugging, log
				// the messages through the logger that prints to Go Debug output
				// channel.
				this.logger?.error(msg);
			}
		);
		const socket = await new Promise<net.Socket>((resolve, reject) => {
			// eslint-disable-next-line prefer-const
			let timer: NodeJS.Timeout;
			const s = net.createConnection(port, host, () => {
				clearTimeout(timer);
				resolve(s);
			});
			timer = setTimeout(() => {
				reject('connection timeout');
				s?.destroy();
			}, 1000);
		});

		this.dlvDapServer = dlvDapServer;
		this.port = port;
		this.socket = socket;
		this.start(this.socket, this.socket);
	}

	private outputEvent(dest: string, output: string, data?: any) {
		this.sendMessageToClient(new OutputEvent(output, dest, data));
	}
}

export async function startDapServer(
	configuration: vscode.DebugConfiguration,
	log?: (msg: string) => void,
	logErr?: (msg: string) => void,
	logConsole?: (msg: string) => void
): Promise<{ port: number; host: string; dlvDapServer?: ChildProcessWithoutNullStreams }> {
	const host = configuration.host || '127.0.0.1';

	if (configuration.port) {
		// If a port has been specified, assume there is an already
		// running dap server to connect to.
		return { port: configuration.port, host };
	}
	const port = await getPort();
	if (!log) {
		log = appendToDebugConsole;
	}
	if (!logErr) {
		logErr = appendToDebugConsole;
	}
	if (!logConsole) {
		logConsole = appendToDebugConsole;
	}
	const dlvDapServer = await spawnDlvDapServerProcess(configuration, host, port, log, logErr, logConsole);
	return { dlvDapServer, port, host };
}

async function spawnDlvDapServerProcess(
	launchArgs: vscode.DebugConfiguration,
	host: string,
	port: number,
	log: (msg: string) => void,
	logErr: (msg: string) => void,
	logConsole: (msg: string) => void
): Promise<ChildProcess> {
	const launchArgsEnv = launchArgs.env || {};
	const env = Object.assign({}, process.env, launchArgsEnv);

	const dlvPath = launchArgs.dlvToolPath ?? getTool('dlv-dap');

	if (!fs.existsSync(dlvPath)) {
		const envPath = process.env['PATH'] || (process.platform === 'win32' ? process.env['Path'] : null);
		logErr(
			`Couldn't find dlv-dap at the Go tools path, ${process.env['GOPATH']}${
				env['GOPATH'] ? ', ' + env['GOPATH'] : ''
			} or ${envPath}`
		);
		throw new Error(
			'Cannot find Delve debugger. Install from https://github.com/go-delve/delve & ensure it is in your Go tools path, "GOPATH/bin" or "PATH".'
		);
	}
	const dlvArgs = new Array<string>();
	dlvArgs.push('dap');
	// add user-specified dlv flags first. When duplicate flags are specified,
	// dlv doesn't mind but accepts the last flag value.
	if (launchArgs.dlvFlags && launchArgs.dlvFlags.length > 0) {
		dlvArgs.push(...launchArgs.dlvFlags);
	}
	dlvArgs.push(`--listen=${host}:${port}`);
	if (launchArgs.showLog) {
		dlvArgs.push('--log=' + launchArgs.showLog.toString());
	}
	if (launchArgs.logOutput) {
		dlvArgs.push('--log-output=' + launchArgs.logOutput);
	}

	const onWindows = process.platform === 'win32';

	if (!onWindows) {
		dlvArgs.push('--log-dest=3');
	}

	const logDest = launchArgs.logDest;
	if (typeof logDest === 'number') {
		logErr('Using a file descriptor for `logDest` is not allowed.');
		throw new Error('Using a file descriptor for `logDest` is not allowed.');
	}
	if (logDest && !path.isAbsolute(logDest)) {
		logErr(
			'Using a relative path for `logDest` is not allowed.\nSee [variables](https://code.visualstudio.com/docs/editor/variables-reference)'
		);
		throw new Error('Using a relative path for `logDest` is not allowed');
	}
	if (logDest && onWindows) {
		logErr(
			'Using `logDest` or `--log-dest` is not supported on windows yet. See https://github.com/golang/vscode-go/issues/1472.'
		);
		throw new Error('Using `logDest` on windows is not allowed');
	}

	const logDestStream = logDest ? fs.createWriteStream(logDest) : undefined;

	logConsole(`Running: ${dlvPath} ${dlvArgs.join(' ')}\n`);

	const dir = parseProgramArgSync(launchArgs).dirname;
	// TODO(hyangah): determine the directories:
	//    run `dlv` => where dlv will create the default __debug_bin. (This won't work if the directory is not writable. Fix it)
	//    build program => 'program' directory. (This won't work for multimodule workspace. Fix it)
	//    run program => cwd (If test, make sure to run in the package directory.)
	return await new Promise<ChildProcess>((resolve, reject) => {
		const p = spawn(dlvPath, dlvArgs, {
			cwd: dir,
			env,
			stdio: ['pipe', 'pipe', 'pipe', 'pipe'] // --log-dest=3
		});
		let started = false;
		const timeoutToken: NodeJS.Timer = setTimeout(
			() => reject(new Error('timed out while waiting for DAP server to start')),
			5_000
		);

		const stopWaitingForServerToStart = (err?: string) => {
			clearTimeout(timeoutToken);
			started = true;
			if (err) {
				logConsole(`Failed to start 'dlv': ${err}\nKilling the dlv process...`);
				killProcessTree(p); // We do not need to wait for p to actually be killed.
				reject(new Error(err));
			} else {
				resolve(p);
			}
		};

		p.stdout.on('data', (chunk) => {
			const msg = chunk.toString();
			if (!started) {
				if (msg.startsWith('DAP server listening at:')) {
					stopWaitingForServerToStart();
				} else {
					stopWaitingForServerToStart(`Unexpected output from dlv dap on start: '${msg}'`);
				}
			}
			log(msg);
		});
		p.stderr.on('data', (chunk) => {
			if (!started) {
				stopWaitingForServerToStart(`Unexpected error from dlv dap on start: '${chunk.toString()}'`);
			}
			logErr(chunk.toString());
		});
		p.stdio[3].on('data', (chunk) => {
			const msg = chunk.toString();
			if (!started) {
				if (msg.startsWith('DAP server listening at:')) {
					stopWaitingForServerToStart();
				} else {
					stopWaitingForServerToStart(`Expected 'DAP server listening at:' from debug adapter got '${msg}'`);
				}
			}
			if (logDestStream) {
				// always false on windows.
				// write to the specified file.
				logDestStream?.write(chunk, (err) => {
					if (err) {
						logConsole(`Error writing to ${logDest}: ${err}, log may be incomplete.`);
					}
				});
			} else {
				logConsole(msg);
			}
		});
		p.stdio[3].on('close', () => {
			// always false on windows.
			logDestStream?.end();
		});
		p.on('close', (code, signal) => {
			// TODO: should we watch 'exit' instead?

			// NOTE: log messages here may not appear in DEBUG CONSOLE if the termination of
			// the process was triggered by debug adapter's dispose when dlv dap doesn't
			// respond to disconnect on time. In that case, it's possible that the session
			// is in the middle of teardown and DEBUG CONSOLE isn't accessible. Check
			// Go Debug output channel.
			if (!started) {
				stopWaitingForServerToStart(`dlv dap terminated with code: ${code} signal: ${signal}\n`);
			}
			if (typeof code === 'number') {
				// The process exited on its own.
				logConsole(`dlv dap (${p.pid}) exited with code: ${code}\n`);
			} else if (code === null && signal) {
				logConsole(`dlv dap (${p.pid}) was killed by signal: ${signal}\n`);
			} else {
				logConsole(`dlv dap (${p.pid}) terminated with code: ${code} signal: ${signal}\n`);
			}
		});
		p.on('error', (err) => {
			if (!started) {
				stopWaitingForServerToStart(`Unexpected error from dlv dap on start: '${err}'`);
			}
			if (err) {
				logConsole(`Error: ${err}\n`);
			}
		});
	});
}

export function parseProgramArgSync(
	launchArgs: vscode.DebugConfiguration
): { program: string; dirname: string; programIsDirectory: boolean } {
	const program = launchArgs.program;
	if (!program) {
		throw new Error('The program attribute is missing in the debug configuration in launch.json');
	}
	let programIsDirectory = false;
	try {
		programIsDirectory = fs.lstatSync(program).isDirectory();
	} catch (e) {
		// TODO(hyangah): why can't the program be a package name?
		throw new Error('The program attribute must point to valid directory, .go file or executable.');
	}
	if (!programIsDirectory && launchArgs.mode !== 'exec' && path.extname(program) !== '.go') {
		throw new Error('The program attribute must be a directory or .go file in debug and test mode');
	}
	const dirname = programIsDirectory ? program : path.dirname(program);
	return { program, dirname, programIsDirectory };
}

// appendToDebugConsole is declared as an exported const rather than a function, so it can be stubbbed in testing.
export const appendToDebugConsole = (msg: string) => {
	console.error(msg);
};
