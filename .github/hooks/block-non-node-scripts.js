#!/usr/bin/env node
/**
 * Hook: PreToolUse
 * Blocks execution of disallowed script interpreters and runners.
 *
 * Permitted: node, npm, now-sdk
 * Not permitted: npx, python, perl, ruby, php, powershell, and their file extensions.
 *
 * node is guaranteed to be available in any ServiceNow SDK project, so all
 * agent scripting must stay within node/npm/now-sdk.
 *
 * Input (stdin): GitHub Copilot PreToolUse hook JSON payload
 * Output (stdout): JSON { permissionDecision: "deny", stopReason: string } | {}
 */

'use strict';

// Permitted runners (for documentation — enforced via the blocklist below)
// node, npm, now-sdk

// Runners and interpreters that are NOT permitted
const BLOCKED = [
  { pattern: /(?:^|\s)npx(?:\s|$)/i,     name: 'npx'        },
  { pattern: /(?:^|\s)python[23]?\s/i,   name: 'Python'     },
  { pattern: /(?:^|\s)perl\s/i,           name: 'Perl'       },
  { pattern: /(?:^|\s)ruby\s/i,           name: 'Ruby'       },
  { pattern: /(?:^|\s)php\s/i,            name: 'PHP'        },
  { pattern: /(?:^|\s)pwsh\s/i,           name: 'PowerShell' },
  { pattern: /(?:^|\s)powershell\s/i,     name: 'PowerShell' },
  { pattern: /\S+\.py(?:\s|$)/i,          name: 'Python'     },
  { pattern: /\S+\.pl(?:\s|$)/i,          name: 'Perl'       },
  { pattern: /\S+\.rb(?:\s|$)/i,          name: 'Ruby'       },
  { pattern: /\S+\.php(?:\s|$)/i,         name: 'PHP'        },
  { pattern: /\S+\.ps1(?:\s|$)/i,         name: 'PowerShell' },
];

// Tools that actually execute commands — ignore file reads, edits, etc.
const EXECUTE_TOOLS = new Set([
  'execute/runInTerminal',
  'execute/createAndRunTask',
  'execute/runCommand',
  'execute/runScript',
  'terminal',
  'shell',
]);

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

  const toolName = hookInput.tool_name || '';

  // Only inspect execution tools
  const isExecTool = EXECUTE_TOOLS.has(toolName) ||
    toolName.startsWith('execute/') ||
    toolName.startsWith('terminal');

  if (!isExecTool) {
    process.exit(0);
  }

  const command = (
    hookInput?.tool_input?.command ||
    hookInput?.tool_input?.script ||
    ''
  ).trim();

  if (!command) {
    process.exit(0);
  }

  // Check command against the blocklist
  for (const { pattern, name } of BLOCKED) {
    if (pattern.test(command + ' ')) {
      process.stdout.write(JSON.stringify({
        permissionDecision: 'deny',
        stopReason: `${name} is not permitted. Only node, npm, and now-sdk may be used — these are guaranteed to be available in any ServiceNow SDK project.`,
      }));
      process.exit(0);
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(1));
