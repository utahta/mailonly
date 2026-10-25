// Runs the app on a copy of Electron with the cookieEncryption fuse on, so
// sessions signed in during development are not stored in plaintext. The
// installed copy in node_modules/electron is left unchanged.
import { flipFuses, FuseV1Options, FuseVersion } from '@electron/fuses';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
// Downloads the binary first if npm has not fetched it yet.
const installed = require('electron') as string;
const electronDir = path.dirname(require.resolve('electron/package.json'));
const { version } = require('electron/package.json') as { version: string };
const binary = path.relative(path.join(electronDir, 'dist'), installed);
const dir = path.join(electronDir, '..', '.cache', 'mailonly-electron');
const stamp = path.join(dir, 'version');

if (!fs.existsSync(stamp) || fs.readFileSync(stamp, 'utf8') !== version) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(path.join(electronDir, 'dist'), dir, {
    recursive: true,
    verbatimSymlinks: true,
    mode: fs.constants.COPYFILE_FICLONE,
  });
  await flipFuses(path.join(dir, binary), {
    version: FuseVersion.V1,
    // macOS refuses to launch the binary once its signature no longer matches.
    resetAdHocDarwinSignature: process.platform === 'darwin',
    [FuseV1Options.EnableCookieEncryption]: true,
  });
  fs.writeFileSync(stamp, version);
}

const child = spawn(path.join(dir, binary), ['.', ...process.argv.slice(2)], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
