import { validateAgents } from './AgentValidation';

const extensionPath = process.argv[2] ?? process.cwd();
const result = validateAgents(extensionPath);

if (result.issues.length === 0) {
    console.log(`Validated ${result.agentCount} bundled agents.`);
    process.exit(0);
}

for (const issue of result.issues) {
    const location = [issue.file, issue.agent].filter(Boolean).join(' / ');
    const prefix = location ? `${issue.severity.toUpperCase()} ${location}` : issue.severity.toUpperCase();
    console.error(`${prefix}: ${issue.message}`);
}

const errorCount = result.issues.filter(issue => issue.severity === 'error').length;
const warningCount = result.issues.filter(issue => issue.severity === 'warning').length;
console.error(`Agent validation failed with ${errorCount} error(s) and ${warningCount} warning(s).`);
process.exit(errorCount > 0 ? 1 : 0);
