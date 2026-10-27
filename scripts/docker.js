/**
 * Docker: image size, and container cold start until the first answer, for a static page and an SSR page,
 * with the same --cpus/--memory limits (scripts/lib/docker.js). Builds the images first.
 *
 *   pnpm bench:docker --runs 30
 */
import { abOrder, APPS } from './lib/apps.js';
import { buildImage, imageSizeMb, LIMITS, startContainer } from './lib/docker.js';
import { saveResult } from './lib/results.js';
import { args, summarize } from './lib/stats.js';

const options = args({ runs: 30, skipBuild: false });

const images = {};
for (const key of Object.keys(APPS)) {
    const buildMs = options.skipBuild ? null : buildImage(key);
    images[key] = { buildMs, sizeMb: imageSizeMb(key) };
    console.log(`${APPS[key].name.padEnd(15)} image ${images[key].sizeMb} MB`);
}

const samples = Object.fromEntries(Object.keys(APPS).map((key) => [key, { firstResponseMs: [], firstSsrMs: [], idleMemoryMb: [] }]));
for (let round = 0; round < options.runs; round++) {
    for (const key of abOrder(round)) {
        const container = await startContainer(key);
        try {
            // The first request to a server-rendered page pays for loading the route's code.
            const started = performance.now();
            await (await fetch(`${container.url}/products/7`)).arrayBuffer();
            const firstSsrMs = performance.now() - started;
            const idle = await container.stats();
            samples[key].firstResponseMs.push(container.startupMs);
            samples[key].firstSsrMs.push(firstSsrMs);
            samples[key].idleMemoryMb.push(idle.memoryMb);
            console.log(`round ${round + 1}/${options.runs} ${APPS[key].name.padEnd(15)} up ${Math.round(container.startupMs)} ms  first SSR ${Math.round(firstSsrMs)} ms  ${idle.memoryMb} MB`);
        } finally {
            await container.stop();
        }
    }
}

saveResult('docker', {
    limits: LIMITS,
    runs: options.runs,
    note: 'firstResponseMs: `docker run` until `/` answers (includes Docker start overhead, the same for both). firstSsrMs: the first request to /products/7 right after.',
    apps: Object.fromEntries(
        Object.keys(APPS).map((key) => [
            key,
            {
                ...images[key],
                firstResponseMs: summarize(samples[key].firstResponseMs),
                firstSsrMs: summarize(samples[key].firstSsrMs),
                idleMemoryMb: summarize(samples[key].idleMemoryMb),
            },
        ]),
    ),
});
