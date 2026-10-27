/**
 * Build time: cold (no output, no cache) and warm (cache kept from the previous build), in A/B order.
 *
 *   pnpm bench:build --runs 10
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { abOrder, APPS, ROOT } from './lib/apps.js';
import { saveResult } from './lib/results.js';
import { args, summarize } from './lib/stats.js';

const options = args({ runs: 10 });

const build = (key) => {
    const started = performance.now();
    const result = spawnSync('pnpm', ['--filter', APPS[key].filter, 'build'], { cwd: ROOT, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'ignore', 'pipe'] });
    if (result.status !== 0) throw new Error(`${APPS[key].name} build failed:\n${result.stderr}`);
    return performance.now() - started;
};

const clean = (paths) => {
    for (const path of paths) rmSync(join(ROOT, path), { recursive: true, force: true });
};

/** Deletes the build output but keeps the bundler caches, also when a cache lives inside the output (`.next/cache`). */
const cleanKeepingCaches = (app) => {
    for (const output of app.buildOutputs) {
        if (app.buildCaches.includes(output)) continue;
        const inner = app.buildCaches.filter((cache) => cache.startsWith(`${output}/`));
        if (inner.length === 0) clean([output]);
        else if (existsSync(join(ROOT, output))) {
            for (const entry of readdirSync(join(ROOT, output))) {
                const path = join(output, entry);
                if (!inner.some((cache) => !relative(path, cache).startsWith('..'))) clean([path]);
            }
        }
    }
};

const samples = Object.fromEntries(Object.keys(APPS).map((key) => [key, { cold: [], warm: [] }]));

for (let round = 0; round < options.runs; round++) {
    for (const key of abOrder(round)) {
        const app = APPS[key];
        clean([...app.buildOutputs, ...app.buildCaches]);
        const cold = build(key);
        // Warm: the output is removed, the bundler's cache stays.
        cleanKeepingCaches(app);
        const warm = build(key);
        samples[key].cold.push(cold);
        samples[key].warm.push(warm);
        console.log(`round ${round + 1}/${options.runs}  ${app.name.padEnd(15)} cold ${(cold / 1000).toFixed(2)} s  warm ${(warm / 1000).toFixed(2)} s`);
    }
}

saveResult('build', {
    runs: options.runs,
    note: 'Wall time of `pnpm --filter <app> build`. Cold: output and bundler cache deleted. Warm: output deleted, cache kept.',
    apps: Object.fromEntries(Object.entries(samples).map(([key, value]) => [key, { coldMs: summarize(value.cold), warmMs: summarize(value.warm) }])),
});
