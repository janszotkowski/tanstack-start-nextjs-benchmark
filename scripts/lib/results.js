import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { ROOT } from './apps.js';

const version = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8')).version;

/** Everything needed to reproduce a result: the machine, the runtime and the exact framework versions. */
export const environment = () => ({
    date: new Date().toISOString(),
    machine: { cpu: os.cpus()[0]?.model, cores: os.cpus().length, memoryGb: Math.round(os.totalmem() / 1024 ** 3), platform: `${os.platform()} ${os.release()}` },
    node: process.version,
    pnpm: execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim(),
    versions: {
        next: version('apps/next/node_modules/next/package.json'),
        '@tanstack/react-start': version('apps/start/node_modules/@tanstack/react-start/package.json'),
        '@tanstack/react-router': version('apps/start/node_modules/@tanstack/react-router/package.json'),
        vite: version('apps/start/node_modules/vite/package.json'),
        react: version('apps/next/node_modules/react/package.json'),
        tailwindcss: version('apps/next/node_modules/tailwindcss/package.json'),
    },
});

/** Writes `results/<name>.json` (what the report reads) next to the environment it was measured in. */
export const saveResult = (name, data) => {
    mkdirSync(join(ROOT, 'results'), { recursive: true });
    const file = join(ROOT, 'results', `${name}.json`);
    writeFileSync(file, `${JSON.stringify({ environment: environment(), ...data }, null, 4)}\n`);
    console.log(`→ ${file}`);
};
