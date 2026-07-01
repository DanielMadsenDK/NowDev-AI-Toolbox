function applyFrontmatterModel(content: string, model: string | string[] | undefined): string {
    const models = normalizeModelList(model);
    if (models.length === 0) { return content; }
    return setFrontmatterField(content, 'model', models.length === 1 ? quoteYamlScalar(models[0]) : formatInlineArray(models));
}

function normalizeModelList(model: string | string[] | undefined): string[] {
    if (Array.isArray(model)) {
        return model.map(item => item.trim()).filter(Boolean);
    }
    return model?.trim() ? [model.trim()] : [];
}

function setFrontmatterField(content: string, key: string, renderedValue: string): string {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) { return content; }

    const frontmatter = match[1];
    const lines = frontmatter.split(/\r?\n/);
    const fieldIndex = lines.findIndex(line => new RegExp(`^${escapeRegExp(key)}:`).test(line));
    const replacement = `${key}: ${renderedValue}`;

    if (fieldIndex >= 0) {
        let endIndex = fieldIndex + 1;
        while (endIndex < lines.length && !/^[A-Za-z0-9_-]+:/.test(lines[endIndex]) && !/^\s*\{\{[#/]agent:/.test(lines[endIndex])) {
            endIndex++;
        }
        lines.splice(fieldIndex, endIndex - fieldIndex, replacement);
    } else {
        const descriptionIndex = lines.findIndex(line => /^description:/.test(line));
        const nameIndex = lines.findIndex(line => /^name:/.test(line));
        const insertAfter = descriptionIndex >= 0 ? descriptionIndex : nameIndex;
        lines.splice(insertAfter >= 0 ? insertAfter + 1 : 0, 0, replacement);
    }

    const updatedFrontmatter = lines.join('\n');
    return content.replace(/^---\n[\s\S]*?\n---/, `---\n${updatedFrontmatter}\n---`);
}

function formatInlineArray(values: string[]): string {
    return `[${values.map(quoteYamlScalar).join(', ')}]`;
}

function quoteYamlScalar(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readTag(content: string, tag: string): string {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = content.match(new RegExp(`^${escaped}\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : '';
}

export {
    applyFrontmatterModel,
    normalizeModelList,
    setFrontmatterField,
    formatInlineArray,
    quoteYamlScalar,
    escapeRegExp,
    readTag,
};
