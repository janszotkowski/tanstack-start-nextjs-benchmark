/**
 * Browser metrics, in A/B order. For every route and sample:
 *   1. a cold Lighthouse navigation: TTFB, FCP, LCP, TBT, CLS, JS execution, bytes and requests;
 *   2. a separate cold load in a fresh page, without Lighthouse, then one real interaction: its Event Timing latency
 *      (what INP is computed from) and how long until the DOM shows the result.
 * The interaction is measured outside Lighthouse on purpose: a Lighthouse timespan records a full trace (JS sampling,
 * screenshots), which inflated a 5,000-row sort from ~0.2 s to ~1.3 s and hid the real latency.
 *
 * Both apps sit behind the same compressing proxy (scripts/lib/proxy.js), as they would behind nginx in production.
 * Throttling is applied for real (devtools / CDP), not simulated, with the same values in both steps:
 *   desktop: no throttling, 1350×940
 *   mobile:  4× CPU slowdown, 4G-like network (150 ms RTT, 1.6 Mbps down), 412×823
 *
 *   pnpm bench:lighthouse --runs 30 --profiles desktop,mobile
 */
import { launch } from 'chrome-launcher';
import { desktopConfig, startFlow } from 'lighthouse';
import puppeteer from 'puppeteer-core';
import { abOrder, APPS } from './lib/apps.js';
import { startProxy } from './lib/proxy.js';
import { saveResult } from './lib/results.js';
import { sleep, startServer } from './lib/server.js';
import { args, summarize } from './lib/stats.js';

const options = args({ runs: 30, profiles: 'desktop,mobile', routes: '' });

// The throttling and screen of each profile, applied over CDP for the interaction step (Lighthouse applies the same in its own).
const EMULATION = {
    desktop: { latency: 0, downloadKbps: 0, uploadKbps: 0, cpu: 1, viewport: { width: 1350, height: 940, deviceScaleFactor: 1, isMobile: false, hasTouch: false } },
    mobile: { latency: 150 * 3.75, downloadKbps: 1638.4 * 0.9, uploadKbps: 750 * 0.9, cpu: 4, viewport: { width: 412, height: 823, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true } },
};

const PROFILES = {
    desktop: {
        config: { ...desktopConfig, settings: { ...desktopConfig.settings, throttlingMethod: 'devtools', throttling: { ...desktopConfig.settings.throttling, cpuSlowdownMultiplier: 1 } } },
    },
    mobile: {
        config: {
            extends: 'lighthouse:default',
            settings: {
                formFactor: 'mobile',
                throttlingMethod: 'devtools',
                throttling: {
                    requestLatencyMs: EMULATION.mobile.latency,
                    downloadThroughputKbps: EMULATION.mobile.downloadKbps,
                    uploadThroughputKbps: EMULATION.mobile.uploadKbps,
                    cpuSlowdownMultiplier: EMULATION.mobile.cpu,
                },
                screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
            },
        },
    },
};

const mainText = (page) => page.evaluate(() => document.querySelector('main')?.textContent ?? '');

/** How long a person looks at a loaded page before acting, and rests the pointer on a link before clicking it. */
const DWELL_MS = 3000;
const HOVER_MS = 200;

/**
 * A client-side navigation through a link, the way a person does it: the pointer rests on the link for a moment,
 * then clicks. Returns ms from the click until the page's content has changed. (Clicking the instant the pointer
 * arrives would deny Start's hover preload the time it gets in real use; Next's viewport prefetch had the dwell.)
 */
const navigateBy = (selector) => async (page) => {
    const before = await mainText(page);
    await page.hover(selector);
    await sleep(HOVER_MS);
    const started = Date.now();
    await page.click(selector);
    await page.waitForFunction((text) => document.querySelector('main')?.textContent !== text, { timeout: 30_000 }, before);
    return Date.now() - started;
};

/**
 * Records Event Timing entries (what INP is computed from) for the interactions that follow. Lighthouse's own INP audit
 * is reported too, but it is often not applicable to a single click in a timespan.
 */
const observeInteractions = (page) =>
    page.evaluate(() => {
        window.__interactions = [];
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) if (entry.interactionId) window.__interactions.push(entry.duration);
        }).observe({ type: 'event', durationThreshold: 16, buffered: false });
    });

/** The slowest interaction since `observeInteractions`, in ms; 0 when every interaction stayed under 16 ms. */
const slowestInteraction = (page) => page.evaluate(() => Math.max(0, ...window.__interactions));

/** Each route, and the interaction measured after its cold load. */
const SCENARIOS = [
    { path: '/', interaction: 'client nav → /blog', run: navigateBy('header a[href="/blog"]') },
    { path: '/blog/post-42', interaction: 'client nav → /products', run: navigateBy('header a[href="/products"]') },
    { path: '/products?category=audio&sort=price-asc', interaction: 'client nav → page 2', run: navigateBy('main nav a') },
    {
        path: '/products/7',
        interaction: 'submit review (mutation + refresh)',
        run: async (page) => {
            const before = await page.evaluate(() => document.querySelectorAll('section li').length);
            await page.type('input[name="author"]', 'Lighthouse');
            await page.type('input[name="text"]', 'Measured review');
            const started = Date.now();
            await page.click('button[type="submit"]:not(form[method="get"] button)');
            await page.waitForFunction((count) => document.querySelectorAll('section li').length > count, { timeout: 30_000 }, before);
            return Date.now() - started;
        },
    },
    {
        path: '/dashboard',
        interaction: 'sort 5k rows by revenue, then filter',
        run: async (page) => {
            const started = Date.now();
            await page.evaluate(() => [...document.querySelectorAll('th button')].find((button) => button.textContent?.startsWith('Revenue'))?.click());
            await page.waitForFunction(() => document.querySelector('th button')?.parentElement?.parentElement?.textContent?.includes('Revenue ↓'), { timeout: 30_000 });
            const sortMs = Date.now() - started;
            await page.type('input[aria-label="Filter rows"]', 'EU');
            return sortMs;
        },
    },
];

const audit = (lhr, id) => lhr.audits[id]?.numericValue;

const metricsOf = (navigation) => {
    const requests = navigation.audits['network-requests']?.details?.items ?? [];
    const scripts = requests.filter((request) => request.resourceType === 'Script');
    return {
        ttfb: audit(navigation, 'server-response-time'),
        fcp: audit(navigation, 'first-contentful-paint'),
        lcp: audit(navigation, 'largest-contentful-paint'),
        tbt: audit(navigation, 'total-blocking-time'),
        cls: audit(navigation, 'cumulative-layout-shift'),
        speedIndex: audit(navigation, 'speed-index'),
        // Time the main thread spent running the page's JavaScript on load: for these pages mostly hydration.
        jsExecution: audit(navigation, 'bootup-time'),
        requests: requests.length,
        jsRequests: scripts.length,
        jsTransferKb: scripts.reduce((sum, request) => sum + (request.transferSize ?? 0), 0) / 1024,
        totalTransferKb: (audit(navigation, 'total-byte-weight') ?? 0) / 1024,
        performanceScore: (navigation.categories.performance?.score ?? 0) * 100,
    };
};

/** A fresh, cold, throttled page without Lighthouse: load the route, let it settle, run the interaction. */
const measureInteraction = async (url, profile, scenario) => {
    const emulation = EMULATION[profile];
    const page = await browser.newPage();
    try {
        const cdp = await page.createCDPSession();
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: emulation.latency,
            downloadThroughput: emulation.downloadKbps === 0 ? -1 : (emulation.downloadKbps * 1024) / 8,
            uploadThroughput: emulation.uploadKbps === 0 ? -1 : (emulation.uploadKbps * 1024) / 8,
        });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: emulation.cpu });
        await page.setViewport(emulation.viewport);
        // Loaded, idle, and then a moment of reading before acting, so work scheduled for idle time (Next's prefetch) has run.
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 120_000 });
        await sleep(DWELL_MS);
        await observeInteractions(page);
        const interactionMs = await scenario.run(page);
        // Let the last frame paint, so its Event Timing entry is complete.
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 100))));
        return { eventLatency: await slowestInteraction(page), interactionMs };
    } finally {
        await page.close();
    }
};

const scenarios = options.routes === '' ? SCENARIOS : SCENARIOS.filter((scenario) => options.routes.split(',').includes(scenario.path));
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions', '--no-first-run'] });
const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}`, defaultViewport: null });

const samples = {};
const servers = {};
const proxies = {};
try {
    for (const key of Object.keys(APPS)) {
        servers[key] = await startServer(key);
        proxies[key] = await startProxy(servers[key].url, APPS[key].port + 100);
    }
    for (let round = 0; round < options.runs; round++) {
        for (const profile of options.profiles.split(',')) {
            for (const scenario of scenarios) {
                for (const key of abOrder(round)) {
                    const page = await browser.newPage();
                    try {
                        const flow = await startFlow(page, { config: PROFILES[profile].config });
                        await flow.navigate(proxies[key].url + scenario.path);
                        const result = await flow.createFlowResult();
                        await page.close();
                        const interaction = await measureInteraction(proxies[key].url + scenario.path, profile, scenario);
                        const metrics = { ...metricsOf(result.steps[0].lhr), ...interaction };
                        const id = `${profile} ${scenario.path}`;
                        samples[key] ??= {};
                        samples[key][id] ??= { profile, route: scenario.path, interaction: scenario.interaction, values: {} };
                        for (const [name, value] of Object.entries(metrics)) (samples[key][id].values[name] ??= []).push(value);
                        console.log(
                            `round ${round + 1}/${options.runs} ${profile.padEnd(7)} ${APPS[key].name.padEnd(15)} ${scenario.path.padEnd(42)} LCP ${Math.round(metrics.lcp)} ms  TBT ${Math.round(metrics.tbt)} ms  event ${Math.round(metrics.eventLatency)} ms  interaction ${metrics.interactionMs} ms`,
                        );
                    } finally {
                        if (!page.isClosed()) await page.close();
                    }
                }
            }
        }
    }
} finally {
    for (const proxy of Object.values(proxies)) await proxy.stop();
    for (const server of Object.values(servers)) await server.stop();
    await browser.disconnect();
    chrome.kill();
}

saveResult('lighthouse', {
    options,
    note: 'Per sample: a cold Lighthouse navigation for the load metrics, then a separate cold load without Lighthouse for the interaction (same throttling). Times in ms, sizes in kB. eventLatency is the slowest Event Timing duration during the interaction (the INP input; 0 = under 16 ms); interactionMs is wall time from the action until the DOM shows its result.',
    apps: Object.fromEntries(
        Object.entries(samples).map(([key, entries]) => [
            key,
            Object.values(entries).map((entry) => ({
                profile: entry.profile,
                route: entry.route,
                interaction: entry.interaction,
                ...Object.fromEntries(Object.entries(entry.values).map(([name, values]) => [name, summarize(values)])),
            })),
        ]),
    ),
});
