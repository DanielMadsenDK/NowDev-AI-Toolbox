import * as cp from 'child_process';

export interface SdkProcessOptions {
    cwd?: string;
    timeout?: number;
}

export function spawnSdk(args: string[], options: SdkProcessOptions = {}): cp.ChildProcessWithoutNullStreams {
    return cp.spawn('now-sdk', args, {
        cwd: options.cwd,
        timeout: options.timeout,
        shell: false,
    });
}

export function spawnNpm(args: string[], options: SdkProcessOptions = {}): cp.ChildProcessWithoutNullStreams {
    const executable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    return cp.spawn(executable, args, {
        cwd: options.cwd,
        timeout: options.timeout,
        shell: false,
    });
}