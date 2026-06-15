FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/data ./data
COPY package.json ./

ENV SEED_DATA_PATH=/app/data/seed.json
ENV CORS_ORIGINS=http://localhost:3000
ENV TRANSITION_TO_RUNNING_SECONDS=1.0
ENV TRANSITION_TO_TERMINAL_SECONDS=1.0

EXPOSE 8000
CMD ["node", "dist/main.js"]
