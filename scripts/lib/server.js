import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { APPS, ROOT } from './apps.js';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls until the server answers, and returns how long that took (ms). */
export const waitForServer = async (url, timeoutMs = 60_000) => {
    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
        try {
            const response = await fetch(url);
            await response.arrayBuffer();
            if (response.status < 500) return performance.now() - started;
        } catch {
            // Not listening yet.
        }
        await sleep(20);
    }
    throw new Error(`${url} did not answer within ${timeoutMs} ms`);
};

/**
 * Starts an app's production server on its own port and resolves once it answers.
 * Only this child is ever stopped (by its PID), never anything matched by name.
 */
export const startServer = async (key) => {
    const app = APPS[key];
    const started = performance.now();
    const child = spawn(process.execPath, [join(ROOT, app.server)], {
        cwd: ROOT,
        env: { ...process.env, NODE_ENV: 'production', PORT: String(app.port), HOSTNAME: '127.0.0.1', HOST: '127.0.0.1', NEXT_TELEMETRY_DISABLED: '1' },
        stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk));
    const url = `http://127.0.0.1:${app.port}`;
    try {
        await waitForServer(`${url}/`);
    } catch (error) {
        child.kill('SIGKILL');
        throw new Error(`${app.name} did not start: ${error.message}\n${stderr}`);
    }
    return {
        url,
        pid: child.pid,
        startupMs: performance.now() - started,
        stop: () =>
            new Promise((resolve) => {
                if (child.exitCode !== null) return resolve();
                child.once('exit', resolve);
                child.kill('SIGTERM');
            }),
    };
};

/** Resident memory of one process, in MB (macOS and Linux `ps`). */
export const rssMb = async (pid) => {
    const { execFileSync } = await import('node:child_process');
    const kb = Number(execFileSync('ps', ['-o', 'rss=', '-p', String(pid)], { encoding: 'utf8' }).trim());
    return Math.round((kb / 1024) * 10) / 10;
};
