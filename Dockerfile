# Two images from one install: `docker build --target next -t bench-next .` and `--target start -t bench-start .`
# (scripts/docker.js builds both). Same base, same Node, same pnpm, same runtime settings; only the app differs.
#
# The Node and pnpm versions are the ones in .node-version and package.json (`pnpm policy` fails when they differ).
# The base image is pinned by digest: `docker buildx imagetools inspect node:<version>-bookworm-slim` for a new one.

FROM node:24.22.1-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS base
ENV PNPM_HOME=/pnpm CI=true NEXT_TELEMETRY_DISABLED=1
ENV PATH=$PNPM_HOME:$PATH
RUN npm install --global pnpm@12.14.0
WORKDIR /repo

FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/next/package.json apps/next/
COPY apps/start/package.json apps/start/
COPY packages/data/package.json packages/data/
COPY packages/ui/package.json packages/ui/

FROM manifests AS source
COPY tsconfig.base.json ./
COPY packages packages

# ---- Next.js ----
FROM source AS next-build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile --store-dir /pnpm/store --filter @bench/next...
COPY apps/next apps/next
RUN pnpm --filter @bench/next build

FROM node:24.22.1-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS next
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=next-build --chown=node:node /repo/apps/next/.next/standalone ./
USER node
EXPOSE 3000
CMD ["node", "apps/next/server.js"]

# ---- TanStack Start ----
FROM source AS start-build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile --store-dir /pnpm/store --filter @bench/start...
COPY apps/start apps/start
RUN pnpm --filter @bench/start build

FROM node:24.22.1-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS start
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=start-build --chown=node:node /repo/apps/start/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
