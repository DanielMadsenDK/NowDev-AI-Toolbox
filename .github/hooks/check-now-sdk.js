#!/usr/bin/env node
/**
 * Hook: SessionStart
 * Checks that now-sdk is installed and now.config.json exists in the workspace.
 * Emits a systemMessage warning if either is missing.
 *
 * Input (stdin): GitHub Copilot hook JSON payload
 * Output (stdout): JSON { systemMessage?: string }
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function readStdin() {
  return new Promise((resolve) => {
    // If running interactively (no piped input), don't hang
    if (process.stdin.isTTY) {
      resolve('{}');
      return;
    }
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data || '{}'));
    // Safety timeout — hooks should not block the agent indefinitely
    setTimeout(() => resolve(data || '{}'), 5000);
  });
}

async function main() {
  const raw = await readStdin();
  let hookInput = {};
  try {
    hookInput = JSON.parse(raw);
  } catch {
    // Malformed input — silently continue, don't block agent
    process.exit(0);
  }

  // cwd from hook payload is the user's workspace root
  const cwd = hookInput.cwd || process.cwd();
  const warnings = [];

  // 1. Check now-sdk is in PATH
  try {
    execSync('now-sdk --version', { stdio: 'ignore', timeout: 10000 });
  } catch {
    warnings.push('now-sdk not found in PATH. Install with: npm install -g @servicenow/sdk');
  }

  // 2. Check now.config.json exists in the workspace root
  if (!fs.existsSync(path.join(cwd, 'now.config.json'))) {
    warnings.push('now.config.json not found in workspace root — this may not be a ServiceNow SDK project.');
  }

  if (warnings.length > 0) {
    process.stdout.write(JSON.stringify({
      systemMessage: warnings.map((w) => `WARNING: ${w}`).join('\n'),
    }));
  }

  process.exit(0);
}

main().catch(() => process.exit(1));
