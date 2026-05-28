# ---- builder: install everything + compile TS → dist/ ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime: minimal image with only prod deps + compiled JS ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

# dbmate for migrations on container start (linux/amd64 binary).
# Pin the version deliberately — bump when you want a newer release.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl ca-certificates \
	&& curl -fsSL -o /usr/local/bin/dbmate \
	https://github.com/amacneil/dbmate/releases/download/v2.27.0/dbmate-linux-amd64 \
	&& chmod +x /usr/local/bin/dbmate \
	&& apt-get purge -y --auto-remove curl \
	&& rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Compiled app + migration files + entrypoint
COPY --from=builder /app/dist ./dist
COPY db ./db
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Informational only — actual listen port is read from the PORT env var.
EXPOSE 7000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
