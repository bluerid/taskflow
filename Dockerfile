# ---- Base Image ----
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
# Copy package files
COPY package*.json ./
# Install dependencies (including devDependencies for building)
RUN npm ci

# ---- Build ----
FROM base AS builder
# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy source code
COPY . .
# Build the TypeScript code
RUN npm run build

# ---- Release ----
FROM base AS release
# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
# Copy production node_modules (excluding devDependencies)
COPY --from=deps /app/node_modules ./node_modules
# Copy package.json for potential npm commands (optional)
COPY package*.json ./

# Expose the port the app runs on
EXPOSE 3000

# Start the server
CMD ["node", "dist/server.js"]