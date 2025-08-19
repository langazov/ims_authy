# Build stage
FROM --platform=linux/amd64 node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm cache clean --force && npm ci --ignore-scripts
RUN npm rebuild

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx-main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create writable temporary directories for nginx
RUN mkdir -p /tmp/proxy_temp /tmp/client_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp /var/run && \
    chown -R nginx:nginx /tmp/proxy_temp /tmp/client_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp /var/run && \
    chmod -R 755 /tmp/proxy_temp /tmp/client_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp /var/run

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]