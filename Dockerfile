# Stage 1 — builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install root (frontend) deps
COPY package.json package-lock.json ./
RUN npm ci

# Install server deps
COPY server/package.json server/package-lock.json ./server/
RUN npm ci --prefix server

# Copy source
COPY . .

# Build frontend (output: dist/)
RUN npm run build

# Build server TypeScript (output: server/dist/)
RUN npm run build --prefix server

# Stage 2 — runtime
FROM node:20-alpine AS runtime
WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /data

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules ./server/node_modules

# db.ts compiles to server/dist/db.js; __dirname at runtime = /app/server/dist/
# migrations are resolved as path.join(__dirname, 'migrations') → /app/server/dist/migrations/
COPY --from=builder /app/server/src/migrations ./server/dist/migrations

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app /data
USER appuser

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/dist/index.js"]
