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

# Run migrations before build
RUN npx prisma migrate deploy

# Build application
RUN npm run build

# Expose port
EXPOSE 3001

# Start application
CMD ["npm", "run", "start:prod"]

