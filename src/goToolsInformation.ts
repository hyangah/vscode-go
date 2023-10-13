// <!-- Everything below this line is generated. DO NOT EDIT. -->

import moment = require('moment');
import semver = require('semver');
import { Tool } from './goTools';

export const allToolsInformation: { [key: string]: Tool } = {
	'gomodifytags': {
		name: 'gomodifytags',
		importPath: 'github.com/fatih/gomodifytags',
		modulePath: 'github.com/fatih/gomodifytags',
		replacedByGopls: false,
		isImportant: false,
		description: 'Modify tags on structs',
		defaultVersion: 'v1.16.0'
	},
	'goplay': {
		name: 'goplay',
		importPath: 'github.com/haya14busa/goplay/cmd/goplay',
		modulePath: 'github.com/haya14busa/goplay',
		replacedByGopls: false,
		isImportant: false,
		description: 'The Go playground',
		defaultVersion: 'v1.0.0'
	},
	'impl': {
		name: 'impl',
		importPath: 'github.com/josharian/impl',
		modulePath: 'github.com/josharian/impl',
		replacedByGopls: false,
		isImportant: false,
		description: 'Stubs for interfaces',
		defaultVersion: 'v1.1.0'
	},
	'gofumpt': {
		name: 'gofumpt',
		importPath: 'mvdan.cc/gofumpt',
		modulePath: 'mvdan.cc/gofumpt',
		replacedByGopls: true,
		isImportant: false,
		description: 'Formatter',
		defaultVersion: 'v0.5.0'
	},
	'goimports': {
		name: 'goimports',
		importPath: 'golang.org/x/tools/cmd/goimports',
		modulePath: 'golang.org/x/tools',
		replacedByGopls: true,
		isImportant: true,
		description: 'Formatter'
	},
	'goformat': {
		name: 'goformat',
		importPath: 'winterdrache.de/goformat/goformat',
		modulePath: 'winterdrache.de/goformat/goformat',
		replacedByGopls: true,
		isImportant: false,
		description: 'Formatter',
		defaultVersion: 'v0.0.0-20180512004123-256ef38c4271'
	},
	'gotests': {
		name: 'gotests',
		importPath: 'github.com/cweill/gotests/gotests',
		modulePath: 'github.com/cweill/gotests',
		replacedByGopls: false,
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
		replacedByGopls: false,
		isImportant: false,
		description: 'Linter',
		minimumGoVersion: semver.coerce('1.9')
	},
	'staticcheck': {
		name: 'staticcheck',
		importPath: 'honnef.co/go/tools/cmd/staticcheck',
		modulePath: 'honnef.co/go/tools',
		replacedByGopls: false,
		isImportant: true,
		description: 'Linter'
	},
	'golangci-lint': {
		name: 'golangci-lint',
		importPath: 'github.com/golangci/golangci-lint/cmd/golangci-lint',
		modulePath: 'github.com/golangci/golangci-lint',
		replacedByGopls: false,
		isImportant: true,
		description: 'Linter'
	},
	'revive': {
		name: 'revive',
		importPath: 'github.com/mgechev/revive',
		modulePath: 'github.com/mgechev/revive',
		isImportant: true,
		description: 'Linter',
		defaultVersion: 'v1.3.2'
	},
	'gopls': {
		name: 'gopls',
		importPath: 'golang.org/x/tools/gopls',
		modulePath: 'golang.org/x/tools/gopls',
		replacedByGopls: false, // lol
		isImportant: true,
		description: 'Language Server from Google',
		usePrereleaseInPreviewMode: true,
		minimumGoVersion: semver.coerce('1.13'),
		latestVersion: semver.parse('v0.13.2'),
		latestVersionTimestamp: moment('2023-08-10', 'YYYY-MM-DD'),
		latestPrereleaseVersion: semver.parse('v0.14.0-pre.3'),
		latestPrereleaseVersionTimestamp: moment('2023-10-11', 'YYYY-MM-DD')
	},
	'dlv': {
		name: 'dlv',
		importPath: 'github.com/go-delve/delve/cmd/dlv',
		modulePath: 'github.com/go-delve/delve',
		replacedByGopls: false,
		isImportant: true,
		description: 'Go debugger (Delve)',
		latestVersion: semver.parse('v1.6.1'), // minimum version that supports DAP
		latestVersionTimestamp: moment('2021-05-19', 'YYYY-MM-DD'),
		minimumGoVersion: semver.coerce('1.12') // dlv requires 1.12+ for build
	},
	'fillstruct': {
		name: 'fillstruct',
		importPath: 'github.com/davidrjenni/reftools/cmd/fillstruct',
		modulePath: 'github.com/davidrjenni/reftools',
		replacedByGopls: true,
		isImportant: false,
		description: 'Fill structs with defaults',
		defaultVersion: 'v0.0.0-20210213085015-40322ffdc2e4'
	}
};
