import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    applyFrontmatterModel,
    normalizeModelList,
    setFrontmatterField,
    quoteYamlScalar,
    readTag,
} from '../agentSync/frontmatter';

const doc = `---
name: Sample
description: A sample agent.
tools: ['read/readFile']
---

Body text.
`;

test('normalizeModelList handles strings, arrays, and blanks', () => {
    assert.deepEqual(normalizeModelList(undefined), []);
    assert.deepEqual(normalizeModelList('  '), []);
    assert.deepEqual(normalizeModelList('gpt'), ['gpt']);
    assert.deepEqual(normalizeModelList([' a ', '', 'b']), ['a', 'b']);
});

test('applyFrontmatterModel inserts a single quoted model after description', () => {
    const output = applyFrontmatterModel(doc, 'model-x');
    assert.ok(output.includes("model: 'model-x'"));
    assert.ok(output.indexOf('model:') > output.indexOf('description:'));
    assert.ok(output.includes('Body text.'));
});

test('applyFrontmatterModel renders arrays inline and is a no-op for empty input', () => {
    const output = applyFrontmatterModel(doc, ['a', 'b']);
    assert.ok(output.includes("model: ['a', 'b']"));
    assert.equal(applyFrontmatterModel(doc, undefined), doc);
});

test('setFrontmatterField replaces an existing field in place', () => {
    const output = setFrontmatterField(doc, 'description', quoteYamlScalar('Replaced.'));
    assert.ok(output.includes("description: 'Replaced.'"));
    assert.ok(!output.includes('A sample agent.'));
});

test('quoteYamlScalar escapes single quotes', () => {
    assert.equal(quoteYamlScalar("it's"), "'it''s'");
});

test('readTag extracts a stamped metadata tag value', () => {
    const stamped = `---\n# nowdev-managed: true\n# nowdev-hash: abc123\nname: X\n---\n`;
    assert.equal(readTag(stamped, '# nowdev-hash:'), 'abc123');
    assert.equal(readTag(stamped, '# nowdev-missing:'), '');
});
