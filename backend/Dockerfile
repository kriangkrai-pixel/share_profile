FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code (includes prisma directory if it exists in build context)
COPY . .

# Generate Prisma Client (only if prisma schema exists)
# This step will fail gracefully if prisma directory doesn't exist
RUN if [ -f "./prisma/schema.prisma" ]; then npx prisma generate; else echo "Warning: Prisma schema not found at ./prisma/schema.prisma"; fi

# Build application
RUN npm run build

# Expose port
EXPOSE 3001

# Start application
CMD ["npm", "run", "start:prod"]

