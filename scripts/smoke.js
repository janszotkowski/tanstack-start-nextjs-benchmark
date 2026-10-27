/**
 * Starts both production builds and checks that every page answers with the right status and content,
 * so a benchmark never measures an error page. Run after `pnpm build`.
 */
import { APPS } from './lib/apps.js';
import { startServer } from './lib/server.js';

const CHECKS = [
    { path: '/', status: 200, text: 'Same app, two frameworks' },
    { path: '/blog', status: 200, text: 'post-200' },
    { path: '/blog/post-5', status: 200, text: '<h1' },
    { path: '/blog/does-not-exist', status: 404 },
    { path: '/products', status: 200, text: '1000 products' },
    { path: '/products?category=audio&sort=price-asc&page=2', status: 200, text: 'page <!-- -->2' },
    { path: '/products/7', status: 200, text: 'Reviews' },
    { path: '/products/99999', status: 404 },
    { path: '/dashboard', status: 200, text: '5,000 rows' },
    { path: '/api/search?q=lor', status: 200, json: true },
];

let failed = 0;
for (const key of Object.keys(APPS)) {
    const server = await startServer(key);
    try {
        for (const check of CHECKS) {
            const response = await fetch(server.url + check.path);
            const body = await response.text();
            const problems = [];
            if (response.status !== check.status) problems.push(`status ${response.status}, expected ${check.status}`);
            if (check.text !== undefined && !body.replaceAll('<!-- -->', '').includes(check.text.replaceAll('<!-- -->', ''))) problems.push(`missing "${check.text}"`);
            if (check.json && !Array.isArray(JSON.parse(body))) problems.push('not a JSON array');
            if (problems.length > 0) failed++;
            console.log(`${problems.length === 0 ? 'ok  ' : 'FAIL'} ${APPS[key].name.padEnd(15)} ${check.path}${problems.length === 0 ? '' : `  → ${problems.join(', ')}`}`);
        }
    } finally {
        await server.stop();
    }
}

if (failed > 0) {
    console.error(`${failed} check(s) failed`);
    process.exit(1);
}
