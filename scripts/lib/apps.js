/** The two apps under test, and how each one is built and started. Everything else in scripts/ reads from here. */
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));

export const APPS = {
    next: {
        name: 'Next.js',
        dir: 'apps/next',
        filter: '@bench/next',
        port: 4101,
        devPort: 3001,
        // `output: 'standalone'`: the traced server plus the static files copied next to it.
        server: 'apps/next/.next/standalone/apps/next/server.js',
        buildOutputs: ['apps/next/.next'],
        buildCaches: ['apps/next/.next/cache'],
    },
    start: {
        name: 'TanStack Start',
        dir: 'apps/start',
        filter: '@bench/start',
        port: 4102,
        devPort: 3002,
        server: 'apps/start/.output/server/index.mjs',
        buildOutputs: ['apps/start/.output', 'apps/start/node_modules/.nitro', 'apps/start/node_modules/.vite'],
        buildCaches: ['apps/start/node_modules/.vite', 'apps/start/node_modules/.nitro'],
    },
};

/** The pages every benchmark visits, one per rendering mode. */
export const ROUTES = [
    { path: '/', mode: 'static' },
    { path: '/blog/post-42', mode: 'prerendered (200 pages)' },
    { path: '/products?category=audio&sort=price-asc&page=2', mode: 'SSR + search params' },
    { path: '/products/7', mode: 'SSR, dynamic param' },
    { path: '/dashboard', mode: 'client-heavy (5k rows)' },
    { path: '/api/search?q=lor', mode: 'API route' },
];

/** Both apps in A/B order, flipped on every other round so heat and caches do not favour one side. */
export const abOrder = (round) => (round % 2 === 0 ? ['next', 'start'] : ['start', 'next']);
