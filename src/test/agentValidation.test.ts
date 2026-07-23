import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { test } from 'node:test';
import * as path from 'path';
import { validateAgents, validateSdkAuthorityContent } from '../AgentValidation';

const repoRoot = path.resolve(__dirname, '..', '..');

test('bundled agents and shipped content pass validation with zero errors', () => {
    const result = validateAgents(repoRoot);
    const errors = result.issues.filter(issue => issue.severity === 'error');
    assert.deepEqual(
        errors.map(e => `${e.file ?? ''}: ${e.message}`),
        [],
        'validation errors found'
    );
    const sourceAgentCount = fs.readdirSync(path.join(repoRoot, 'agents', 'github-copilot'))
        .filter(file => file.endsWith('.agent.md')).length;
    assert.equal(result.agentCount, sourceAgentCount);
});

test('SDK authority accepts delegated domain intent without CLI mechanics', () => {
    const issues = validateSdkAuthorityContent(
        'Load nowdev-ai-toolbox-servicenow-sdk, retrieve topic table-api, and query sys_db_object for the required fields.'
    );
    assert.deepEqual(issues, []);
});

test('SDK authority rejects command syntax outside the canonical skill', () => {
    const issues = validateSdkAuthorityContent(
        'Load nowdev-ai-toolbox-servicenow-sdk, then run `now-sdk explain table-api`.'
    );
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /commands or flags/);
});

test('SDK authority requires explicit delegation', () => {
    const issues = validateSdkAuthorityContent('Use now-sdk for live instance evidence.');
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /must delegate CLI mechanics/);
});

test('SDK authority does not treat unrelated short flags as CLI mechanics', () => {
    const issues = validateSdkAuthorityContent(
        'Load nowdev-ai-toolbox-servicenow-sdk before use. Copy the directory with cp -r.'
    );
    assert.deepEqual(issues, []);
});
