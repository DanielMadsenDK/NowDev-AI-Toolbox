import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import * as path from 'path';
import { validateAgents } from '../AgentValidation';

const repoRoot = path.resolve(__dirname, '..', '..');

test('bundled agents and shipped content pass validation with zero errors', () => {
    const result = validateAgents(repoRoot);
    const errors = result.issues.filter(issue => issue.severity === 'error');
    assert.deepEqual(
        errors.map(e => `${e.file ?? ''}: ${e.message}`),
        [],
        'validation errors found'
    );
    assert.ok(result.agentCount >= 15);
});
