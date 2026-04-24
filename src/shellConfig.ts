import * as vscode from 'vscode';

export function getShell(): string {
    const configured = vscode.workspace.getConfiguration('nowdev-ai-toolbox').get<string>('terminalShell', 'auto');
    if (configured === 'auto' || !configured) {
        return process.platform === 'win32' ? 'powershell' : '/bin/sh';
    }
    return configured;
}
