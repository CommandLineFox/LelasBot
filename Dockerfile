# ─── BUILD STAGE ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# 1) Install all deps and build
COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build



# ─── PRODUCTION STAGE ────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /usr/src/app

# 2) Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# 3) Copy in the compiled output
COPY --from=builder /usr/src/app/dist ./dist

# 4) Start the server (env vars come from docker-compose)
CMD ["node", "dist/index.js"]
