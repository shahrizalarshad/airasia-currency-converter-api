# Currency Converter - AirAsia Move Assessment
# Multi-stage Docker build for production optimization

# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install all dependencies for build
RUN npm ci

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create healthcheck script
RUN echo '#!/usr/bin/env node\n\
const http = require("http");\n\
const port = process.env.PORT || 3000;\n\
const options = {\n\
  host: "localhost",\n\
  port: port,\n\
  path: "/api/rates",\n\
  timeout: 2000,\n\
};\n\
const request = http.request(options, (res) => {\n\
  console.log(`STATUS: ${res.statusCode}`);\n\
  if (res.statusCode === 200) {\n\
    process.exit(0);\n\
  } else {\n\
    process.exit(1);\n\
  }\n\
});\n\
request.on("error", function(err) {\n\
  console.log("ERROR");\n\
  process.exit(1);\n\
});\n\
request.on("timeout", function() {\n\
  console.log("TIMEOUT");\n\
  request.destroy();\n\
  process.exit(1);\n\
});\n\
request.end();' > healthcheck.js && chmod +x healthcheck.js

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Start the application
CMD ["node", "server.js"] 