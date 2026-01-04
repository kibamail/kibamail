FROM openresty/openresty:1.25.3.1-alpine

# Install lua-resty-http for making HTTP requests to internal API
RUN opm get ledgetech/lua-resty-http

# Copy nginx configuration
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf

# Copy Lua scripts
COPY lua/ /usr/local/openresty/nginx/lua/

# Create directory for fallback certificates (mounted at runtime)
RUN mkdir -p /etc/ssl/fallback

# Expose HTTPS and HTTP ports
EXPOSE 443 80

# Run OpenResty
CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]
