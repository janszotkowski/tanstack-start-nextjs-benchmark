import { execFileSync } from 'node:child_process';
import { APPS } from './apps.js';
import { waitForServer } from './server.js';

/** Same limits for both containers. Change them here, and say so in the results. */
export const LIMITS = { cpus: '2', memory: '1g' };

export const imageName = (key) => `bench-${key}`;

const docker = (...argv) => execFileSync('docker', argv, { encoding: 'utf8' }).trim();

const parseMb = (text) => {
    const match = /([\d.]+)\s*([KMG]i?B)/.exec(text);
    if (match === null) return Number.NaN;
    const factor = { KiB: 1 / 1024, KB: 1 / 1000, MiB: 1, MB: 1, GiB: 1024, GB: 1000 }[match[2]] ?? 1;
    return Math.round(Number(match[1]) * factor * 10) / 10;
};

/** Runs an app's image with the shared limits, resolves once it answers, and reports how long that took. */
export const startContainer = async (key) => {
    const port = APPS[key].port;
    const started = performance.now();
    const id = docker('run', '-d', '--rm', `--cpus=${LIMITS.cpus}`, `--memory=${LIMITS.memory}`, '-p', `127.0.0.1:${port}:3000`, imageName(key));
    const url = `http://127.0.0.1:${port}`;
    try {
        await waitForServer(`${url}/`);
    } catch (error) {
        docker('rm', '-f', id);
        throw error;
    }
    return {
        url,
        id,
        startupMs: performance.now() - started,
        stats: async () => {
            const [memory, cpu] = docker('stats', '--no-stream', '--format', '{{.MemUsage}}|{{.CPUPerc}}', id).split('|');
            return { memoryMb: parseMb(memory.split('/')[0]), cpuPercent: Number.parseFloat(cpu) };
        },
        stop: async () => {
            docker('rm', '-f', id);
        },
    };
};

export const buildImage = (key) => {
    const started = performance.now();
    execFileSync('docker', ['build', '--target', key, '-t', imageName(key), '.'], { stdio: ['ignore', 'ignore', 'inherit'] });
    return performance.now() - started;
};

export const imageSizeMb = (key) => Math.round((Number(docker('image', 'inspect', '--format', '{{.Size}}', imageName(key))) / 1024 / 1024) * 10) / 10;
