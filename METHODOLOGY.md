# Methodology

## What is the same in both apps

- **Components and data.** Every page renders components from `packages/ui` with data from `packages/data`. The data is generated from a fixed seed in memory, so there is no database or network noise, and both apps serve byte-identical content.
- **Versions.** Same React, Node, pnpm, Tailwind and TypeScript, pinned in the lockfile. Framework versions are written into every result file.
- **Rendering mode per route.** `/`, `/blog/*` and `/dashboard` are prerendered at build time; `/products` and `/products/[id]` are rendered on every request (`searchParams` / `connection()` in Next, server functions in Start).
- **Data boundary.** Data is read on the server only: server components in Next, `createServerFn` in Start. A client-side navigation fetches it over HTTP in both (RSC payload vs server function).
- **Mutation.** Adding a review is a server action + `refresh()` in Next and a server function + `router.invalidate()` in Start.
- **Production builds.** Telemetry off (`NEXT_TELEMETRY_DISABLED=1`), no analytics, no web fonts (system font stack), `poweredByHeader` off.
- **Compression.** Neither app compresses by itself (`compress: false` in Next; Nitro does not compress server-rendered responses). Browser measurements go through the same compressing reverse proxy (`scripts/lib/proxy.js`, brotli 4 / gzip 6), as a production nginx or Caddy would. Load tests hit the app servers directly, uncompressed.
- **Cache headers.** Start is given exactly the `Cache-Control` Next sends by default: `s-maxage=31536000` on prerendered pages, `private, no-cache, no-store, max-age=0, must-revalidate` on server-rendered pages, nothing on the API, `public, max-age=31536000, immutable` on hashed assets.
- **Docker.** The same `node:24.22.1-bookworm-slim` base pinned by digest, the same runtime settings, the same `--cpus 2 --memory 1g`.
- **Order.** Every benchmark alternates the apps (A/B, then B/A) so heat and caches do not favour one side.

## Idiomatic defaults that differ on purpose

These are the frameworks' own recommended defaults, kept as they are and named in the results:

- **Link prefetching.** Next prefetches links in the viewport in production; Start is set to `defaultPreload: 'intent'` (on hover/focus), the setting its docs recommend.
- **Bundler.** Turbopack (Next's default for `next build`) vs Vite 8 with Rolldown.
- **Server output.** `output: 'standalone'` in Next vs Nitro's Node preset in Start.

## Findings while building it

- **Start's own prerender is not served by the Node server.** With `tanstackStart({ prerender })` the HTML lands in `.output/public` after Nitro has listed its public files, so the Node server never serves it and renders the page on every request (measured: `/dashboard` ~110 ms per request instead of ~4 ms). The Start app therefore prerenders through Nitro (`nitro({ prerender: { routes } })`), which serves the files statically with an ETag.
- **Next blocks HMR for other dev origins.** Opening the dev server on `127.0.0.1` instead of `localhost` blocks the HMR socket by default (`allowedDevOrigins`). The dev benchmark uses `localhost`.
- **Typed links vs shared components.** Both routers' typed links need an assertion when the href comes from a shared component as a plain string (`as Route` in Next, `to={undefined as never}` with `href` in Start).

## How each number is taken

| Benchmark | Method                                                                                                                                                                                                                                                                                                                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build     | Wall time of `pnpm --filter <app> build`. Cold: output and bundler caches deleted. Warm: output deleted, caches kept (`.next/cache`, `node_modules/.vite`, `.nitro`).                                                                                                                                                                                                                                 |
| Bundle    | The HTML of each route and every script, module preload and stylesheet it references (except `noModule` scripts, which modern browsers skip; checked against what Chrome actually downloads), compressed with brotli 11 and gzip 9. Lazy chunks loaded later are counted by Lighthouse.                                                                                                               |
| Dev       | Caches deleted, dev server spawned in its own process group. First page: spawn until `/` is served. HMR: an edit to `packages/ui/src/Home.tsx` until the browser shows the new heading (the file is always restored). Memory: RSS of the whole process group.                                                                                                                                         |
| Docker    | `docker run` until `/` answers, then the first request to `/products/7`; idle memory from `docker stats`.                                                                                                                                                                                                                                                                                             |
| Load      | autocannon per route and concurrency (10/50/200), 10 s warm-up, then 60 s measured; RSS and CPU sampled every 500 ms.                                                                                                                                                                                                                                                                                 |
| Browser   | Lighthouse user flow per sample: cold navigation (TTFB, FCP, LCP, TBT, CLS, JS execution from `bootup-time`, bytes and requests), then a timespan with one real interaction. Interaction latency is the slowest Event Timing entry during it (what INP is computed from; 0 means under 16 ms). Throttling is applied for real (`devtools`): desktop unthrottled; mobile 4× CPU, 150 ms RTT, 1.6 Mbps. |

Every number is published as median, p95 and standard deviation, never as a single run.

## Not covered yet

- Vercel and Cloudflare tracks (Next is optimised for Vercel; mixing it into the self-hosted numbers would skew them).
- A real-device check (WebPageTest).
- DX metrics (lines of code, config files, time to add a feature), which are subjective and belong in the write-up, not in the tables.
