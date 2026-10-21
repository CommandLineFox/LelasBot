FROM oven/bun:1-alpine AS base
WORKDIR /usr/src/app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

COPY . .

EXPOSE 3005

CMD ["bun", "run", "src/index.ts"]