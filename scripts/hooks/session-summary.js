#!/usr/bin/env node
/**
 * Hook: Stop
 * When an agent session ends, scans for recently modified .js and .now.ts files
 * and appends a summary entry to `.nowdev/session-log.md` in the USER's workspace.
 *
 * Plugin context note: __dirname is the extension install directory.
 * All writes use hookInput.cwd (the user's workspace root) — never __dirname.
 *
 * Input (stdin): GitHub Copilot Stop hook JSON payload
 * Output (stdout): none (fire-and-forget)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Files modified within this window are included in the summary
const LOOKBACK_MS = 4 * 60 * 60 * 1000; // 4 hours

// Directories to skip when scanning for modified files
const SKIP_DIRS = new Set(['node_modules', '.git', 'out', 'dist', '.nowdev']);

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('{}');
      return;
    }
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data || '{}'));
    setTimeout(() => resolve(data || '{}'), 5000);
  });
}

function scanForRecentFiles(rootDir, cutoffMs) {
  const results = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // Permission error or gone — skip silently
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          walk(path.join(dir, entry.name));
        }
        continue;
      }

      const name = entry.name;
      if (!name.endsWith('.js') && !name.endsWith('.now.ts')) continue;

      const fullPath = path.join(dir, name);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.mtimeMs >= cutoffMs) {
          results.push(path.relative(rootDir, fullPath));
        }
      } catch {
        // File gone between readdir and stat — skip
      }
    }
  }

  walk(rootDir);
  return results;
}

async function main() {
  const raw = await readStdin();
  let hookInput = {};
  try {
    hookInput = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  // IMPORTANT: use hookInput.cwd, not __dirname or process.cwd()
  // In plugin context __dirname is the extension install dir, not the user's workspace
  const workspaceRoot = hookInput.cwd || process.cwd();
  const sessionId = hookInput.sessionId || 'unknown';
  const timestamp = hookInput.timestamp || new Date().toISOString();
  const cutoff = Date.now() - LOOKBACK_MS;

  const recentFiles = scanForRecentFiles(workspaceRoot, cutoff);

  const fileList = recentFiles.length > 0
    ? recentFiles.map((f) => `  - \`${f}\``).join('\n')
    : '  - (none detected in last 4 hours)';

  const entry = [
    `\n## Session ${sessionId}`,
    `- **Ended:** ${timestamp}`,
    `- **Workspace:** ${workspaceRoot}`,
    `- **Recently modified files:**`,
    fileList,
    '',
  ].join('\n');

  const logDir = path.join(workspaceRoot, '.nowdev');
  const logFile = path.join(logDir, 'session-log.md');

  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Ensure the file has a header on first creation
    if (!fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, '# NowDev AI Session Log\n', 'utf8');
    }

    fs.appendFileSync(logFile, entry, 'utf8');
  } catch {
    // Non-blocking: read-only workspace, permissions issue, etc.
    process.exit(1);
  }

  process.exit(0);
}

main().catch(() => process.exit(1));
