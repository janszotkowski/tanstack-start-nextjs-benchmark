import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // A self-contained server in .next/standalone: the self-hosted track runs it in Docker like the Start app's .output.
    output: 'standalone',
    outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
    // The shared packages are TypeScript source.
    transpilePackages: ['@bench/ui', '@bench/data'],
    typedRoutes: true,
    poweredByHeader: false,
    // Compression is left to the same reverse proxy in front of both apps (scripts/lib/proxy.js), as the self-hosting guide
    // suggests; Nitro does not compress server-rendered responses, so app-level gzip would be measured on one side only.
    compress: false,
};

export default nextConfig;
