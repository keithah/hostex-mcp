FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built files
COPY .smithery ./.smithery

# Expose port for HTTP transport
EXPOSE 3000

# Run the shttp server
CMD ["node", ".smithery/shttp/index.cjs"]
