import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import * as fs from 'fs';
import * as path from 'path';
import {
    SDK_QUERY_BLOCK,
    FLUENT_SDK_EXPLAIN_BLOCK,
    applyFluentSdkExplainToken,
    applyDevOpsPreambleToken,
    applyProfileInstructionsToken,
    applyAgentConditionals,
} from '../agentSync/docTokens';

const repoRoot = path.resolve(__dirname, '..', '..');

test('SDK_QUERY_BLOCK references a skill file that exists', () => {
    const matches = SDK_QUERY_BLOCK.match(/agents\/skills\/[A-Za-z0-9._-]+\/SKILL\.md/g) ?? [];
    assert.ok(matches.length > 0, 'block must cite a skill path');
    for (const skillPath of matches) {
        assert.ok(fs.existsSync(path.join(repoRoot, skillPath)), `missing skill file: ${skillPath}`);
    }
});

test('FLUENT_SDK_EXPLAIN_BLOCK references a skill file that exists', () => {
    const matches = FLUENT_SDK_EXPLAIN_BLOCK.match(/agents\/skills\/[A-Za-z0-9._-]+\/SKILL\.md/g) ?? [];
    assert.ok(matches.length > 0, 'block must cite a skill path');
    for (const skillPath of matches) {
        assert.ok(fs.existsSync(path.join(repoRoot, skillPath)), `missing skill file: ${skillPath}`);
    }
});

test('applyFluentSdkExplainToken expands the token and leaves other content alone', () => {
    const input = 'intro\n{{FLUENT_SDK_EXPLAIN}}\noutro';
    const output = applyFluentSdkExplainToken(input);
    assert.ok(!output.includes('{{FLUENT_SDK_EXPLAIN}}'));
    assert.ok(output.includes('## Fluent SDK Documentation'));
    assert.ok(output.startsWith('intro\n'));
    assert.ok(output.endsWith('outro'));
    assert.equal(applyFluentSdkExplainToken('no token here'), 'no token here');
});

test('applyDevOpsPreambleToken removes the token when integration is disabled', () => {
    const input = 'a\n{{DEVOPS_PREAMBLE}}\nb';
    assert.equal(applyDevOpsPreambleToken(input, undefined), 'a\nb');
    assert.equal(
        applyDevOpsPreambleToken(input, { enabled: false, mcpServer: 'ado', customInstructions: '' }),
        'a\nb'
    );
});

test('applyDevOpsPreambleToken injects the configured MCP server name when enabled', () => {
    const input = '{{DEVOPS_PREAMBLE}}\nrest';
    const output = applyDevOpsPreambleToken(input, { enabled: true, mcpServer: 'azure-devops', customInstructions: 'Use area paths.' });
    assert.ok(!output.includes('{{DEVOPS_PREAMBLE}}'));
    assert.ok(output.includes('azure-devops'));
    assert.ok(output.includes('Use area paths.'));
});

test('applyProfileInstructionsToken removes the token for the default profile', () => {
    const input = 'head\n{{PROFILE_INSTRUCTIONS}}\ntail';
    assert.equal(applyProfileInstructionsToken(input, undefined, undefined, undefined), 'head\ntail');
    assert.equal(applyProfileInstructionsToken(input, '', '  ', ''), 'head\ntail');
});

test('applyProfileInstructionsToken stacks workspace, instance, and profile blocks in order', () => {
    const input = '{{PROFILE_INSTRUCTIONS}}\nbody';
    const output = applyProfileInstructionsToken(input, 'PROFILE TONE', 'CUSTOM RULES', 'KB RULES');
    assert.ok(!output.includes('{{PROFILE_INSTRUCTIONS}}'));
    const workspaceIdx = output.indexOf('## Workspace Guidelines');
    const instanceIdx = output.indexOf('## Instance-Backed Guidelines');
    const profileIdx = output.indexOf('PROFILE TONE');
    assert.ok(workspaceIdx >= 0 && instanceIdx > workspaceIdx && profileIdx > instanceIdx);
    assert.ok(output.includes('CUSTOM RULES'));
    assert.ok(output.includes('KB RULES'));
});

test('applyAgentConditionals keeps enabled blocks and strips disabled ones', () => {
    const input = 'x\n{{#agent:Alpha}}\nalpha content\n{{/agent:Alpha}}\n{{#agent:Beta}}\nbeta content\n{{/agent:Beta}}\ny';
    const output = applyAgentConditionals(input, new Set(['Beta']));
    assert.ok(output.includes('alpha content'));
    assert.ok(!output.includes('beta content'));
    assert.ok(!output.includes('{{#agent:'));
    assert.ok(!output.includes('{{/agent:'));
});
