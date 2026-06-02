# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

# Copy manifests first (better layer caching)
COPY package*.json ./

# Install ALL deps (need devDeps like @nestjs/cli to build)
RUN npm ci

# Copy source
COPY . .

# Compile TypeScript → dist/
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:18-alpine
WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./

# Install production deps only
RUN npm ci --only=production

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Switch to non-root user
USER appuser

EXPOSE 3000

# Use start:prod script (matches nest convention)
CMD ["node", "dist/main.js"]