import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import * as path from 'path';
import { loadAgentRegistry } from '../AgentRegistry';

const repoRoot = path.resolve(__dirname, '..', '..');

test('loadAgentRegistry parses every bundled agent', () => {
    const manifests = loadAgentRegistry(repoRoot);
    assert.ok(manifests.length >= 15, `expected at least 15 agents, got ${manifests.length}`);
    for (const manifest of manifests) {
        assert.ok(manifest.name, `agent in ${manifest.filename} has no name`);
        assert.ok(manifest.filename.endsWith('.agent.md'));
    }
});

test('agent names are unique', () => {
    const manifests = loadAgentRegistry(repoRoot);
    const names = manifests.map(m => m.name);
    assert.equal(new Set(names).size, names.length, `duplicate agent names: ${names.join(', ')}`);
});

test('exactly one user-invocable orchestrator exists', () => {
    const manifests = loadAgentRegistry(repoRoot);
    const invocable = manifests.filter(m => m.userInvocable);
    assert.equal(invocable.length, 1);
    assert.equal(invocable[0].name, 'NowDev AI Agent');
});

test('every subagent and handoff reference resolves to a bundled agent', () => {
    const manifests = loadAgentRegistry(repoRoot);
    const byName = new Set(manifests.map(m => m.name));
    for (const manifest of manifests) {
        for (const sub of manifest.subAgentNames) {
            assert.ok(byName.has(sub), `${manifest.name} references unknown subagent ${sub}`);
        }
        for (const handoff of manifest.handoffAgentNames) {
            assert.ok(byName.has(handoff), `${manifest.name} references unknown handoff agent ${handoff}`);
        }
    }
});
