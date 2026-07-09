# --- Stage 1: Builder ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy only package files first to leverage Docker layer caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for TS compilation)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Compile TypeScript into the dist folder
RUN npm run build


# --- Stage 2: Production ---
FROM node:22-alpine AS runner

WORKDIR /app

# Set the environment variable to production
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies to keep the image lightweight
RUN npm ci --omit=dev

# Copy the compiled output from the builder stage
COPY --from=builder /app/dist ./dist

# Use the built-in non-root "node" user for better security
USER node

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]
