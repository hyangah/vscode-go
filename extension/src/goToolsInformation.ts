// <!-- Everything below this line is generated. DO NOT EDIT. -->

import moment = require('moment');
import semver = require('semver');
import { Tool } from './goTools';

export const allToolsInformation: { [key: string]: Tool } = {
	'gomodifytags': {
		name: 'gomodifytags',
		importPath: 'github.com/fatih/gomodifytags',
		modulePath: 'github.com/fatih/gomodifytags',
		isImportant: false,
		description: 'Modify tags on structs',
		defaultVersion: 'v1.17.0'
	},
	'goplay': {
		name: 'goplay',
		importPath: 'github.com/haya14busa/goplay/cmd/goplay',
		modulePath: 'github.com/haya14busa/goplay',
		isImportant: false,
		description: 'The Go playground',
		defaultVersion: 'v1.0.0'
	},
	'impl': {
		name: 'impl',
		importPath: 'github.com/josharian/impl',
		modulePath: 'github.com/josharian/impl',
		isImportant: false,
		description: 'Stubs for interfaces',
		defaultVersion: 'v1.4.0'
	},
	'gofumpt': {
		name: 'gofumpt',
		importPath: 'mvdan.cc/gofumpt',
		modulePath: 'mvdan.cc/gofumpt',
		isImportant: false,
		description: 'Formatter',
		defaultVersion: 'v0.7.0'
	},
	'goimports': {
		name: 'goimports',
		importPath: 'golang.org/x/tools/cmd/goimports',
		modulePath: 'golang.org/x/tools',
		isImportant: true,
		description: 'Formatter'
	},
	'gotests': {
		name: 'gotests',
		importPath: 'github.com/cweill/gotests/gotests',
		modulePath: 'github.com/cweill/gotests',
		isImportant: false,
		description: 'Generate unit tests',
		minimumGoVersion: semver.coerce('1.9'),
		defaultVersion: 'v1.6.0'
	},
	// TODO(github.com/golang/vscode-go/issues/189): consider disabling lint when gopls is turned on.
	'golint': {
		name: 'golint',
		importPath: 'golang.org/x/lint/golint',
		modulePath: 'golang.org/x/lint',
		isImportant: false,
		description: 'Linter',
		minimumGoVersion: semver.coerce('1.9')
	},
	'staticcheck': {
		name: 'staticcheck',
		importPath: 'honnef.co/go/tools/cmd/staticcheck',
		modulePath: 'honnef.co/go/tools',
		isImportant: true,
		description: 'Linter'
	},
	'golangci-lint': {
		name: 'golangci-lint',
		importPath: 'github.com/golangci/golangci-lint/cmd/golangci-lint',
		modulePath: 'github.com/golangci/golangci-lint',
		isImportant: true,
		description: 'Linter',
		minimumGoVersion: semver.coerce('1.20')
	},
	'revive': {
		name: 'revive',
		importPath: 'github.com/mgechev/revive',
		modulePath: 'github.com/mgechev/revive',
		isImportant: true,
		description: 'Linter',
		defaultVersion: 'v1.3.9'
	},
	'gopls': {
		name: 'gopls',
		importPath: 'golang.org/x/tools/gopls',
		modulePath: 'golang.org/x/tools/gopls',
		isImportant: true,
		description: 'Language Server from Google',
		usePrereleaseInPreviewMode: true,
		minimumGoVersion: semver.coerce('1.19'),
		latestVersion: semver.parse('v0.16.2'),
		latestVersionTimestamp: moment('2024-08-29', 'YYYY-MM-DD')
	},
	'dlv': {
		name: 'dlv',
		importPath: 'github.com/go-delve/delve/cmd/dlv',
		modulePath: 'github.com/go-delve/delve',
		isImportant: false,
		description: 'Go debugger (Delve)',
		latestVersion: semver.parse('v1.8.3'),
		latestVersionTimestamp: moment('2022-04-26', 'YYYY-MM-DD'),
		minimumGoVersion: semver.coerce('1.18')
	},
	'vscgo': {
		name: 'vscgo',
		importPath: 'github.com/golang/vscode-go/vscgo',
		modulePath: 'github.com/golang/vscode-go/vscgo',
		isImportant: false, // TODO: set to true when we need it
		description: 'VS Code Go helper program',
		minimumGoVersion: semver.coerce('1.18')
	}
};
