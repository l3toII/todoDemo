FROM node:20-alpine

# Install dependencies
RUN apk add --no-cache \
    git \
    curl

# Set working directory
WORKDIR /app

# Copy package files
COPY web/package*.json ./

# Install dependencies
RUN npm ci

# Copy application files
COPY web/ ./

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
