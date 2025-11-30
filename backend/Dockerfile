FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy prisma directory BEFORE npm install (needed for postinstall script)
COPY prisma ./prisma/

# Install dependencies (postinstall will run prisma generate)
RUN npm install

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3001

# Start application (รัน migration ก่อน start - DATABASE_URL จะมีใน runtime)
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]

