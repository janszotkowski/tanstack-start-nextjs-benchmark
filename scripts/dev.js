/**
 * Dev server: cold start until the first page answers, first compile of a heavy page, memory of the whole
 * process tree, and HMR (an edit to a shared component until the browser shows it), in A/B order.
 * Caches are deleted before each run, so every start is cold.
 *
 *   pnpm bench:dev --runs 5 --hmr 5
 */
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { abOrder, APPS, ROOT } from './lib/apps.js';
import { saveResult } from './lib/results.js';
import { sleep, waitForServer } from './lib/server.js';
import { args, summarize } from './lib/stats.js';

const options = args({ runs: 5, hmr: 5 });

const DEV = {
    next: { bin: 'apps/next/node_modules/.bin/next', argv: ['dev', '--port'], caches: ['apps/next/.next/dev'] },
    start: { bin: 'apps/start/node_modules/.bin/vite', argv: ['dev', '--strictPort', '--port'], caches: ['apps/start/node_modules/.vite', 'apps/start/node_modules/.nitro'] },
};

// Both apps render this file on their home page, so the same edit goes through each framework's HMR.
const HMR_FILE = join(ROOT, 'packages/ui/src/Home.tsx');
const HMR_TEXT = 'Same app, two frameworks';

/** Resident memory of a process group (the dev server and everything it spawned), in MB. */
const groupRssMb = (pgid) => {
    const lines = execFileSync('ps', ['-A', '-o', 'pgid=,rss='], { encoding: 'utf8' }).trim().split('\n');
    const kb = lines.map((line) => line.trim().split(/\s+/).map(Number)).reduce((sum, [group, rss]) => (group === pgid ? sum + rss : sum), 0);
    return Math.round((kb / 1024) * 10) / 10;
};

const startDev = (key) => {
    const app = APPS[key];
    for (const cache of DEV[key].caches) rmSync(join(ROOT, cache), { recursive: true, force: true });
    // Its own process group, so it and its workers are stopped together and nothing else is touched.
    const child = spawn(join(ROOT, DEV[key].bin), [...DEV[key].argv, String(app.devPort)], {
        cwd: join(ROOT, app.dir),
        env: { ...process.env, NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1', BROWSER: 'none' },
        stdio: 'ignore',
        detached: true,
    });
    return {
        // `localhost`, as a developer opens it: Next blocks its HMR socket for other dev origins (127.0.0.1) by default.
        url: `http://localhost:${app.devPort}`,
        pid: child.pid,
        stop: async () => {
            try {
                process.kill(-child.pid, 'SIGTERM');
            } catch {
                return;
            }
            await sleep(1000);
            try {
                process.kill(-child.pid, 'SIGKILL');
            } catch {
                // Already gone.
            }
        },
    };
};

const original = readFileSync(HMR_FILE, 'utf8');
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run'] });
const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}`, defaultViewport: null });
const samples = Object.fromEntries(Object.keys(APPS).map((key) => [key, { readyMs: [], firstPageMs: [], dashboardCompileMs: [], hmrMs: [], memoryMb: [] }]));

try {
    for (let round = 0; round < options.runs; round++) {
        for (const key of abOrder(round)) {
            const dev = startDev(key);
            try {
                const started = performance.now();
                // Until the server answers anything, and until the home page has actually been compiled and served.
                await waitForServer(`${dev.url}/`, 120_000);
                const firstPageMs = performance.now() - started;
                const compileStarted = performance.now();
                await (await fetch(`${dev.url}/dashboard`)).arrayBuffer();
                const dashboardCompileMs = performance.now() - compileStarted;

                const page = await browser.newPage();
                await page.goto(`${dev.url}/`, { waitUntil: 'networkidle0' });
                await sleep(500);
                for (let edit = 1; edit <= options.hmr; edit++) {
                    const marker = `${HMR_TEXT} ${round}-${edit}`;
                    const editStarted = performance.now();
                    writeFileSync(HMR_FILE, original.replace(`'${HMR_TEXT}'`, `'${marker}'`));
                    await page.waitForFunction((text) => document.querySelector('main h1')?.textContent === text, { timeout: 30_000, polling: 10 }, marker);
                    samples[key].hmrMs.push(performance.now() - editStarted);
                    writeFileSync(HMR_FILE, original);
                    await page.waitForFunction((text) => document.querySelector('main h1')?.textContent === text, { timeout: 30_000, polling: 10 }, HMR_TEXT);
                }
                await page.close();
                samples[key].firstPageMs.push(firstPageMs);
                samples[key].dashboardCompileMs.push(dashboardCompileMs);
                samples[key].memoryMb.push(groupRssMb(dev.pid));
                console.log(
                    `round ${round + 1}/${options.runs} ${APPS[key].name.padEnd(15)} first page ${Math.round(firstPageMs)} ms  /dashboard ${Math.round(dashboardCompileMs)} ms  HMR ${Math.round(samples[key].hmrMs.at(-1))} ms  ${samples[key].memoryMb.at(-1)} MB`,
                );
            } finally {
                writeFileSync(HMR_FILE, original);
                await dev.stop();
            }
        }
    }
} finally {
    writeFileSync(HMR_FILE, original);
    await browser.disconnect();
    chrome.kill();
}

saveResult('dev', {
    runs: options.runs,
    hmrEditsPerRun: options.hmr,
    note: 'Caches deleted before each start. firstPageMs: spawn until / is served (includes compiling it). dashboardCompileMs: first request to /dashboard. hmrMs: file write until the browser shows the new text. memoryMb: RSS of the dev server process group after the run.',
    apps: Object.fromEntries(Object.entries(samples).map(([key, value]) => [key, Object.fromEntries(Object.entries(value).map(([name, values]) => [name, summarize(values)]))])),
});
