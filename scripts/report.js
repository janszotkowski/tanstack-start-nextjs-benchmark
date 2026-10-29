/**
 * Turns results/*.json into RESULTS.md: one table per benchmark, medians with p95 and spread, both apps side by side.
 *
 *   pnpm bench:report
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { APPS, ROOT } from './lib/apps.js';

const load = (name) => {
    const file = join(ROOT, 'results', `${name}.json`);
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
};

const KEYS = Object.keys(APPS);
const fmt = (value, digits = 0) =>
    value === undefined || value === null || Number.isNaN(value) ? '–' : Number(value).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
/** `median (p95 · ±stdev)` */
const stat = (summary, digits = 0) => (summary?.n ? `${fmt(summary.median, digits)} <sub>p95 ${fmt(summary.p95, digits)} · ±${fmt(summary.stdev, digits)}</sub>` : '–');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const appHeads = KEYS.map((key) => APPS[key].name);
const scale = (summary, factor) => (summary?.n ? Object.fromEntries(Object.entries(summary).map(([name, value]) => [name, name === 'n' ? value : value * factor])) : summary);

const sections = [];
const env = ['build', 'bundle', 'dev', 'docker', 'load-local', 'load-docker', 'lighthouse'].map(load).find(Boolean)?.environment;
if (env) {
    sections.push(
        `## Environment\n\n${table(
            ['', ''],
            [
                ['Machine', `${env.machine.cpu}, ${env.machine.cores} cores, ${env.machine.memoryGb} GB, ${env.machine.platform}`],
                ['Node / pnpm', `${env.node} / ${env.pnpm}`],
                ...Object.entries(env.versions).map(([name, version]) => [name, version]),
            ],
        )}`,
    );
}

const build = load('build');
if (build) {
    sections.push(
        `## Build (s, ${build.runs} runs)\n\n${build.note}\n\n${table(
            ['', ...appHeads],
            [
                ['Cold build', ...KEYS.map((key) => stat(scale(build.apps[key].coldMs, 1 / 1000), 2))],
                ['Warm build', ...KEYS.map((key) => stat(scale(build.apps[key].warmMs, 1 / 1000), 2))],
            ],
        )}`,
    );
}

const bundle = load('bundle');
if (bundle) {
    const routes = Object.keys(bundle.apps[KEYS[0]]);
    sections.push(
        `## First-load bytes per route (kB, brotli)\n\n${bundle.note}\n\n${table(
            ['Route', ...KEYS.flatMap((key) => [`${APPS[key].name} JS`, `${APPS[key].name} HTML`, `${APPS[key].name} files`])],
            routes.map((route) => [
                `\`${route}\``,
                ...KEYS.flatMap((key) => [fmt(bundle.apps[key][route].js.brotli / 1024, 1), fmt(bundle.apps[key][route].html.brotli / 1024, 1), bundle.apps[key][route].requests]),
            ]),
        )}`,
    );
}

const dev = load('dev');
if (dev) {
    sections.push(
        `## Dev server (${dev.runs} cold starts, ${dev.hmrEditsPerRun} HMR edits each)\n\n${dev.note}\n\n${table(
            ['', ...appHeads],
            [
                ['First page (ms)', ...KEYS.map((key) => stat(dev.apps[key].firstPageMs))],
                ['First /dashboard compile (ms)', ...KEYS.map((key) => stat(dev.apps[key].dashboardCompileMs))],
                ['HMR, shared component (ms)', ...KEYS.map((key) => stat(dev.apps[key].hmrMs))],
                ['Memory (MB)', ...KEYS.map((key) => stat(dev.apps[key].memoryMb))],
            ],
        )}`,
    );
}

const docker = load('docker');
if (docker) {
    sections.push(
        `## Docker (--cpus ${docker.limits.cpus}, --memory ${docker.limits.memory}, ${docker.runs} runs)\n\n${docker.note}\n\n${table(
            ['', ...appHeads],
            [
                ['Image size (MB)', ...KEYS.map((key) => fmt(docker.apps[key].sizeMb, 1))],
                ['Container start → first response (ms)', ...KEYS.map((key) => stat(docker.apps[key].firstResponseMs))],
                ['First SSR request (ms)', ...KEYS.map((key) => stat(docker.apps[key].firstSsrMs))],
                ['Idle memory (MB)', ...KEYS.map((key) => stat(docker.apps[key].idleMemoryMb, 1))],
            ],
        )}`,
    );
}

for (const target of ['local', 'docker']) {
    const loadResult = load(`load-${target}`);
    if (!loadResult) continue;
    const rows = loadResult.apps[KEYS[0]].routes.map((entry, index) => [
        `\`${entry.route}\` @${entry.connections}`,
        ...KEYS.flatMap((key) => {
            const other = loadResult.apps[key].routes[index];
            const flag = other.errors > 0 ? ' ⚠' : '';
            return [stat(other.rps), `${fmt(other.p50.median)} / ${fmt(other.p99.median)}${flag}`, fmt(other.peakMemoryMb.median)];
        }),
    ]);
    const failed = KEYS.flatMap((key) =>
        loadResult.apps[key].routes.filter((entry) => entry.errors > 0).map((entry) => `${APPS[key].name} \`${entry.route}\` @${entry.connections} (${fmt(entry.errors)} errors + timeouts)`),
    );
    const warning = failed.length
        ? `\n\n⚠ Not valid: ${failed.join(', ')}. The server was saturated (100 % CPU), autocannon's request timeouts piled up and its latency and error counts stop being measurements. Read the req/s as the saturation ceiling, ignore p99.`
        : '';
    sections.push(
        `## Server load, ${target} (${loadResult.options.duration} s per run, ${loadResult.options.rounds} rounds)\n\n${loadResult.note}\n\nIdle memory: ${KEYS.map((key) => `${APPS[key].name} ${fmt(loadResult.apps[key].idleMb.median)} MB`).join(', ')}.\n\n${table(
            ['Route @connections', ...KEYS.flatMap((key) => [`${APPS[key].name} req/s`, 'p50 / p99 ms', 'peak MB'])],
            rows,
        )}${warning}`,
    );
}

const lighthouse = load('lighthouse');
if (lighthouse) {
    const entries = lighthouse.apps[KEYS[0]];
    const metrics = [
        ['ttfb', 'TTFB'],
        ['fcp', 'FCP'],
        ['lcp', 'LCP'],
        ['tbt', 'TBT'],
        ['cls', 'CLS', 3],
        ['jsExecution', 'JS execution'],
        ['jsTransferKb', 'JS transferred (kB)', 1],
        ['requests', 'Requests'],
        ['eventLatency', 'Interaction latency (INP input)'],
        ['interactionMs', 'Interaction done (wall)'],
    ];
    for (const profile of new Set(entries.map((entry) => entry.profile))) {
        const parts = entries
            .filter((entry) => entry.profile === profile)
            .map((entry) => {
                const other = (key) => lighthouse.apps[key].find((item) => item.profile === profile && item.route === entry.route);
                return `### \`${entry.route}\` — then: ${entry.interaction}\n\n${table(
                    ['ms unless noted', ...appHeads],
                    metrics.map(([id, label, digits]) => [label, ...KEYS.map((key) => stat(other(key)?.[id], digits ?? 0))]),
                )}`;
            });
        sections.push(`## Browser, ${profile} (${lighthouse.options.runs} runs)\n\n${lighthouse.note}\n\n${parts.join('\n\n')}`);
    }
}

const markdown = `# Results

Generated by \`pnpm bench:report\` from \`results/*.json\`. Cells are **median** with p95 and standard deviation. See [METHODOLOGY.md](METHODOLOGY.md) for how each number is measured.

${sections.join('\n\n')}
`;
writeFileSync(join(ROOT, 'RESULTS.md'), markdown);
console.log(`→ ${join(ROOT, 'RESULTS.md')} (${sections.length} sections)`);
