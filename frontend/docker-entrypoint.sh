#!/bin/sh
set -e

PORT="${PORT:-80}"
sed -i "s/listen 80;/listen ${PORT};/" /etc/nginx/conf.d/default.conf

if [ ! -f /etc/nginx/certs/cert.pem ]; then
  mkdir -p /etc/nginx/certs
  echo "Generating self-signed cert for PWA HTTPS..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/key.pem \
    -out /etc/nginx/certs/cert.pem \
    -subj "/CN=pickserve.local"
fi

exec nginx -g 'daemon off;'
