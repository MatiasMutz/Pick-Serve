#!/bin/sh
set -e

PORT="${PORT:-80}"
CONF="/etc/nginx/conf.d/default.conf"

# Railway serves a single frontend service: no docker-compose "backend" hostname.
# Set BACKEND_PROXY_URL=http://backend:8000 only when running via docker-compose.
# On Railway, set VITE_API_URL to the backend public URL at build time instead.

cat > "$CONF" <<EOF
server {
    listen ${PORT};
    root /usr/share/nginx/html;
    index index.html;

EOF

if [ -n "$BACKEND_PROXY_URL" ]; then
  cat >> "$CONF" <<EOF
    location /api/ {
        proxy_pass ${BACKEND_PROXY_URL}/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

EOF
fi

cat >> "$CONF" <<EOF
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

if [ "$ENABLE_LOCAL_HTTPS" = "true" ]; then
  mkdir -p /etc/nginx/certs
  if [ ! -f /etc/nginx/certs/cert.pem ]; then
    echo "Generating self-signed cert for local PWA HTTPS..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/certs/key.pem \
      -out /etc/nginx/certs/cert.pem \
      -subj "/CN=pickserve.local"
  fi

  cat >> "$CONF" <<EOF

server {
    listen 443 ssl;
    root /usr/share/nginx/html;
    index index.html;

    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;

EOF

  if [ -n "$BACKEND_PROXY_URL" ]; then
    cat >> "$CONF" <<EOF
    location /api/ {
        proxy_pass ${BACKEND_PROXY_URL}/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

EOF
  fi

  cat >> "$CONF" <<EOF
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
fi

exec nginx -g 'daemon off;'
