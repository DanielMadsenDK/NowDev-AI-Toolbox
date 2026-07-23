#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const tscPath = path.join(repoRoot, 'node_modules', 'typescript', 'lib', 'tsc.js');
const outDir = path.join(repoRoot, 'out');
const distDir = path.join(repoRoot, 'dist');

if (!fs.existsSync(tscPath)) {
    throw new Error('TypeScript is not installed. Run npm ci before debugging.');
}

execFileSync(process.execPath, [tscPath, '-p', repoRoot], {
    cwd: repoRoot,
    stdio: 'inherit',
});

fs.rmSync(distDir, { recursive: true, force: true });
fs.cpSync(outDir, distDir, { recursive: true });

console.log('[build-debug] Compiled CommonJS runtime to dist/.');