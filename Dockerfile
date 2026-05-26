# syntax=docker/dockerfile:1.7
# Multi-stage build for the NestJS backend.
#   Stage 1: install + compile TS.
#   Stage 2: slim runtime with prod deps + dbmate binary + entrypoint.

# ---------- Stage 1: build ----------
FROM node:22-alpine AS build
WORKDIR /app

# Install build-time deps (full set, so we can run nest build).
COPY package*.json ./
RUN npm ci

# Source + config.
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN npm run build

# Prune devDeps so the runtime stage can copy a slim node_modules.
RUN npm prune --omit=dev

# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# dbmate is a single static binary — install once, no Node deps needed.
# Alpine doesn't ship dbmate; pull the published binary from GitHub releases.
ARG DBMATE_VERSION=2.24.2
RUN apk add --no-cache curl bash \
 && curl -fsSL -o /usr/local/bin/dbmate \
      "https://github.com/amacneil/dbmate/releases/download/v${DBMATE_VERSION}/dbmate-linux-amd64" \
 && chmod +x /usr/local/bin/dbmate

# App artifacts.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

# dbmate needs the migrations folder at runtime.
COPY db ./db

# Entrypoint that runs migrations before exec'ing the app CMD.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
