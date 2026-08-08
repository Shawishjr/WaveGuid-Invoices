#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const defaultPort = '5007';
const args = process.argv.slice(2);
const portIndex = args.findIndex((arg) => arg === '-p' || arg === '--port');
const port = portIndex >= 0 && args[portIndex + 1] ? args[portIndex + 1] : defaultPort;
const extraArgs = args.filter((_, index) => index !== portIndex && index !== portIndex + 1);

const safeAliasPath = path.win32.normalize('E:\\WaveGuid-Invoices');
const currentPath = process.cwd();
const useAlias = process.platform === 'win32' && currentPath.includes('#') && fs.existsSync(safeAliasPath);
const finalCwd = useAlias ? safeAliasPath : currentPath;

if (useAlias) {
  console.log('Detected unsafe path character in current directory.');
  console.log('Using clean alias path:', finalCwd);
} else if (process.platform === 'win32' && currentPath.includes('#')) {
  console.warn('Warning: the current folder path contains a `#` character.');
  console.warn('This can break Next.js. Open the project from a clean path alias such as E:\\WaveGuid-Invoices.');
}

const isWindows = process.platform === 'win32';
const command = isWindows ? 'cmd.exe' : 'npm';
const commandArgs = isWindows
  ? ['/c', 'npm', 'exec', '--yes', '--', 'next', 'dev', '-p', port, ...extraArgs]
  : ['exec', '--yes', '--', 'next', 'dev', '-p', port, ...extraArgs];

const child = spawn(command, commandArgs, {
  cwd: finalCwd,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code) => process.exit(code));
child.on('error', (error) => {
  console.error('Failed to start the dev server:', error);
  process.exit(1);
});
