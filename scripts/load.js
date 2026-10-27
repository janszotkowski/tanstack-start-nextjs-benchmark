/**
 * Server throughput and latency under load (autocannon), per route and concurrency level, with a warm-up,
 * in A/B order over several rounds. Memory (RSS) and CPU of the server process are sampled while it runs.
 *
 *   pnpm bench:load --duration 60 --rounds 3
 *   pnpm bench:load --target docker      # against the containers (same --cpus/--memory limits), see scripts/docker.js
 */
import { execFileSync } from 'node:child_process';
import autocannon from 'autocannon';
import { abOrder, APPS, ROUTES } from './lib/apps.js';
import { startContainer } from './lib/docker.js';
import { saveResult } from './lib/results.js';
import { rssMb, sleep, startServer } from './lib/server.js';
import { args, summarize } from './lib/stats.js';

const options = args({ duration: 60, warmup: 10, rounds: 3, connections: '10,50,200', target: 'local' });
const levels = options.connections.split(',').map(Number);

const cpuPercent = (pid) => Number(execFileSync('ps', ['-o', '%cpu=', '-p', String(pid)], { encoding: 'utf8' }).trim());

const run = (url, connections, duration) =>
    new Promise((resolve, reject) => {
        autocannon({ url, connections, duration, pipelining: 1 }, (error, result) => (error ? reject(error) : resolve(result)));
    });

/** Samples memory and CPU every 500 ms until stopped. */
const sampler = (server) => {
    const memory = [];
    const cpu = [];
    const timer = setInterval(async () => {
        try {
            if (server.stats) {
                const stats = await server.stats();
                memory.push(stats.memoryMb);
                cpu.push(stats.cpuPercent);
            } else {
                memory.push(await rssMb(server.pid));
                cpu.push(cpuPercent(server.pid));
            }
        } catch {
            // The process may be between samples while it exits.
        }
    }, 500);
    return { stop: () => (clearInterval(timer), { memoryMb: summarize(memory), peakMemoryMb: Math.max(...memory), cpuPercent: summarize(cpu) }) };
};

const start = (key) => (options.target === 'docker' ? startContainer(key) : startServer(key));

const samples = {};
for (let round = 0; round < options.rounds; round++) {
    for (const key of abOrder(round)) {
        const server = await start(key);
        try {
            await sleep(1000);
            const idleMb = server.stats ? (await server.stats()).memoryMb : await rssMb(server.pid);
            for (const route of ROUTES) {
                for (const connections of levels) {
                    const url = server.url + route.path;
                    await run(url, connections, options.warmup);
                    const watch = sampler(server);
                    const result = await run(url, connections, options.duration);
                    const usage = watch.stop();
                    const id = `${route.path} @${connections}`;
                    samples[key] ??= { idleMb: [], routes: {} };
                    samples[key].routes[id] ??= { route: route.path, mode: route.mode, connections, rps: [], p50: [], p90: [], p99: [], errors: 0, non2xx: 0, peakMemoryMb: [], cpuPercent: [] };
                    const entry = samples[key].routes[id];
                    entry.rps.push(result.requests.average);
                    entry.p50.push(result.latency.p50);
                    entry.p90.push(result.latency.p90);
                    entry.p99.push(result.latency.p99);
                    entry.errors += result.errors + result.timeouts;
                    entry.non2xx += result.non2xx;
                    entry.peakMemoryMb.push(usage.peakMemoryMb);
                    entry.cpuPercent.push(usage.cpuPercent.median ?? 0);
                    console.log(
                        `round ${round + 1}/${options.rounds} ${APPS[key].name.padEnd(15)} ${id.padEnd(58)} ${Math.round(result.requests.average).toString().padStart(6)} req/s  p50 ${result.latency.p50} ms  p99 ${result.latency.p99} ms  ${usage.peakMemoryMb} MB`,
                    );
                }
            }
            samples[key].idleMb.push(idleMb);
        } finally {
            await server.stop();
        }
    }
}

saveResult(`load-${options.target}`, {
    options,
    note: 'autocannon, one route at a time, after a warm-up. req/s is the per-second average of each run; latencies in ms. Each number summarizes the rounds.',
    apps: Object.fromEntries(
        Object.entries(samples).map(([key, value]) => [
            key,
            {
                idleMb: summarize(value.idleMb),
                routes: Object.values(value.routes).map((entry) => ({
                    route: entry.route,
                    mode: entry.mode,
                    connections: entry.connections,
                    rps: summarize(entry.rps),
                    p50: summarize(entry.p50),
                    p90: summarize(entry.p90),
                    p99: summarize(entry.p99),
                    errors: entry.errors,
                    non2xx: entry.non2xx,
                    peakMemoryMb: summarize(entry.peakMemoryMb),
                    cpuPercent: summarize(entry.cpuPercent),
                })),
            },
        ]),
    ),
});
