/**
 * What the browser downloads on first load of each route: the HTML document, and every script and stylesheet it
 * references (scripts, module preloads, stylesheets), raw, gzip and brotli. Lazy chunks loaded later are measured by
 * Lighthouse (`pnpm bench:lighthouse`), not here.
 *
 *   pnpm bench:bundle
 */
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { APPS, ROUTES } from './lib/apps.js';
import { saveResult } from './lib/results.js';
import { startServer } from './lib/server.js';

const sizes = (buffer) => ({
    raw: buffer.length,
    gzip: gzipSync(buffer, { level: 9 }).length,
    brotli: brotliCompressSync(buffer, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
});

const add = (a, b) => ({ raw: a.raw + b.raw, gzip: a.gzip + b.gzip, brotli: a.brotli + b.brotli });
const ZERO = { raw: 0, gzip: 0, brotli: 0 };

const assetUrls = (html, base) => {
    const urls = { js: new Set(), css: new Set() };
    for (const match of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) urls.js.add(new URL(match[1], base).href);
    for (const match of html.matchAll(/<link\b[^>]*>/g)) {
        const tag = match[0];
        const href = /\bhref="([^"]+)"/.exec(tag)?.[1];
        if (href === undefined) continue;
        if (/rel="modulepreload"/.test(tag) || (/rel="preload"/.test(tag) && /as="script"/.test(tag))) urls.js.add(new URL(href, base).href);
        else if (/rel="stylesheet"/.test(tag)) urls.css.add(new URL(href, base).href);
    }
    // Start also imports its entry from an inline module script.
    for (const match of html.matchAll(/import\(["']([^"']+\.js)["']\)/g)) urls.js.add(new URL(match[1], base).href);
    return urls;
};

const download = async (url) => Buffer.from(await (await fetch(url)).arrayBuffer());

const result = {};
for (const key of Object.keys(APPS)) {
    const server = await startServer(key);
    result[key] = {};
    try {
        for (const route of ROUTES) {
            if (route.path.startsWith('/api/')) continue;
            const html = await download(server.url + route.path);
            const urls = assetUrls(html.toString('utf8'), server.url);
            let js = ZERO;
            let css = ZERO;
            for (const url of urls.js) js = add(js, sizes(await download(url)));
            for (const url of urls.css) css = add(css, sizes(await download(url)));
            result[key][route.path] = { html: sizes(html), js, css, jsFiles: urls.js.size, cssFiles: urls.css.size, requests: 1 + urls.js.size + urls.css.size };
            console.log(
                `${APPS[key].name.padEnd(15)} ${route.path.padEnd(50)} JS ${(js.brotli / 1024).toFixed(1)} kB br in ${urls.js.size} files, HTML ${(sizes(html).brotli / 1024).toFixed(1)} kB br`,
            );
        }
    } finally {
        await server.stop();
    }
}

saveResult('bundle', { note: 'Bytes per route on first load, from the HTML: scripts + module preloads + stylesheets. brotli q11, gzip 9.', apps: result });
