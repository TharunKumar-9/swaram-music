# Multi-architecture production image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package file
COPY package.json ./

# Copy app source and static assets
COPY server.js ./
COPY public ./public
COPY data ./data

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Run Swaram
CMD ["node", "server.js"]
