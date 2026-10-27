import { getPosts } from '@bench/data';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

// The same pages Next prerenders: the home page, the blog (index and 200 posts) and the dashboard.
// /products and /products/$id stay server rendered on every request.
//
// They are prerendered by Nitro, not by `tanstackStart({ prerender })`: Start writes its prerendered HTML after Nitro has
// listed the public files, so the Node server never serves it and renders those pages on every request instead
// (checked with @tanstack/react-start 1.169.3 and nitro 3.0.260903-beta). Nitro's own prerender is served as static files.
const PRERENDERED = ['/', '/blog', '/dashboard', ...getPosts().map((post) => `/blog/${post.slug}`)];

export default defineConfig({
    // The prerender step fetches the pages from a preview server; pinned to the address so `localhost` cannot resolve to ::1.
    preview: {
        host: '127.0.0.1',
    },
    resolve: {
        tsconfigPaths: true,
    },
    plugins: [
        tanstackStart(),
        nitro({
            prerender: { routes: PRERENDERED, crawlLinks: false, failOnError: true },
            // The same Cache-Control as Next sends by default, so neither app gets a caching advantage:
            // prerendered pages `s-maxage=31536000`, server-rendered pages `no-store`, the API none.
            // (Hashed files under /assets already get `immutable` from Nitro, like Next's /_next/static.)
            routeRules: {
                '/products': { headers: { 'cache-control': 'private, no-cache, no-store, max-age=0, must-revalidate' } },
                '/products/**': { headers: { 'cache-control': 'private, no-cache, no-store, max-age=0, must-revalidate' } },
                ...Object.fromEntries(PRERENDERED.map((path) => [path, { headers: { 'cache-control': 's-maxage=31536000' } }])),
                '/assets/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
            },
            // `'use client'` only means something to a server-components bundler. Start renders without that boundary,
            // so the directive (in TanStack Router and in packages/ui) is inert and its "may not be preserved" warning is noise.
            rolldownConfig: {
                onLog: (level, log, defaultHandler) => {
                    if (log.code === 'MODULE_LEVEL_DIRECTIVE' && log.message.includes('"use client"')) return;
                    defaultHandler(level, log);
                },
            },
        }),
        viteReact(),
        tailwindcss(),
    ],
});
