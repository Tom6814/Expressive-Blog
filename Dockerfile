# ============================================
# Stage 1: Build
# ============================================
FROM node:22-slim AS builder
WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:22-slim
WORKDIR /app

# Install runtime dependencies for native modules
RUN apt-get update && apt-get install -y python3 --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

# Copy package files and install production deps
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Create data directory for SQLite
RUN mkdir -p /app/data /app/uploads && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

ENV NODE_ENV=production
ENV DB_PATH=/app/data/blog.db
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/server.cjs"]
