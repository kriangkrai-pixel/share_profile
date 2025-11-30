# ใช้ Node.js 20 Alpine
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy backend package.json and prisma directory BEFORE npm install
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/

# Copy prisma directory to root level as well (for root dependencies if needed)
COPY backend/prisma ./prisma/

# Temporarily disable postinstall script in backend to avoid errors during npm ci
RUN cd backend && npm pkg delete scripts.postinstall || true

# Install dependencies
RUN npm ci

# Manually generate Prisma Client after install (for backend)
RUN if [ -f "./backend/prisma/schema.prisma" ]; then cd backend && npx prisma generate; else echo "Warning: Backend Prisma schema not found, skipping generation"; fi

# Generate Prisma Client for root if needed
RUN if [ -f "./prisma/schema.prisma" ]; then npx prisma generate; else echo "Warning: Root Prisma schema not found, skipping generation"; fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set DATABASE_URL for build time
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

