# syntax=docker/dockerfile:1.10
# Node/TypeScript API image — built in GitHub Actions for linux/arm64, pushed to GHCR, deployed by Coolify.
# Template from the infra repo (skills/coolify-app). Adapted for locus-back.
#
# Private packages from GitHub Packages are installed with a BuildKit secret (never a layer):
#   docker build --secret id=npm_token,env=NODE_AUTH_TOKEN -t app .
# Without a .npmrc / private packages the secret is simply unused.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
# .npmrc* = optional (only repos with private packages have one)
COPY package.json package-lock.json .npmrc* ./

# All dependencies + build
FROM base AS build
RUN --mount=type=secret,id=npm_token,env=NODE_AUTH_TOKEN \
    --mount=type=cache,target=/root/.npm \
    npm ci
# tsconfig + src (incl. src/data: JSON + blog Markdown, copied to dist/data by `npm run build`)
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production dependencies only
FROM base AS prod-deps
RUN --mount=type=secret,id=npm_token,env=NODE_AUTH_TOKEN \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
# Coolify's health check runs curl or wget INSIDE the container; slim images have neither.
RUN apt-get update \
    && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# PORT = the port the app listens on (also Coolify "ports_exposes")
ENV NODE_ENV=production \
    PORT=7001
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
# Compiled code + dist/data (read from process.cwd()/dist/data at runtime)
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 7001
# /api/health (no rate limiter in this app)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||7001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Entry point
CMD ["node", "dist/app.js"]
