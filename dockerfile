# Step 1: Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build NestJS
RUN npm run build

# Step 2: Production stage
FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

# Copy build output
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
