#!/usr/bin/env node
/**
 * Hook: PostToolUse
 * After the agent writes a .now.ts file, runs `now-sdk build` in the workspace.
 * Injects build results as additionalContext so the agent can self-correct immediately.
 *
 * OS-agnostic: uses Node child_process — no bash, no jq, no platform-specific syntax.
 *
 * Input (stdin): GitHub Copilot PostToolUse hook JSON payload
 * Output (stdout): JSON { additionalContext?: string }
 */

'use strict';

const { execSync } = require('child_process');

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

async function main() {
  const raw = await readStdin();
  let hookInput = {};
  try {
    hookInput = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  // PostToolUse payload: tool_input contains what was passed to the tool
  const filePath =
    hookInput?.tool_input?.file_path ||
    hookInput?.tool_input?.path ||
    '';

  // Only trigger for .now.ts file writes
  if (!filePath.endsWith('.now.ts')) {
    process.exit(0);
  }

  // Use cwd from hook payload — this is the user's workspace root, not the extension dir
  const cwd = hookInput.cwd || process.cwd();

  try {
    const output = execSync('now-sdk build', {
      cwd,
      timeout: 60000,
      encoding: 'utf8',
    });
    process.stdout.write(JSON.stringify({
      additionalContext: `now-sdk build succeeded:\n${output.trim()}`,
    }));
  } catch (err) {
    const errorOutput = [err.stdout, err.stderr]
      .filter(Boolean)
      .join('\n')
      .trim();
    process.stdout.write(JSON.stringify({
      additionalContext: `now-sdk build FAILED after writing ${filePath}. Fix the errors before proceeding:\n\n${errorOutput}`,
    }));
  }

  process.exit(0);
}

main().catch(() => process.exit(1));
