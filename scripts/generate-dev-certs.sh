#!/bin/sh
set -e

CERT_DIR="$(dirname "$0")/../frontend/certs"
mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_DIR/cert.pem" ]; then
  echo "Generating self-signed HTTPS cert for local PWA testing..."
  LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERT_DIR/key.pem" \
    -out "$CERT_DIR/cert.pem" \
    -subj "/CN=pickserve.local" \
    -addext "subjectAltName=DNS:localhost,DNS:pickserve.local,IP:127.0.0.1,IP:${LOCAL_IP}" 2>/dev/null \
    || openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout "$CERT_DIR/key.pem" \
      -out "$CERT_DIR/cert.pem" \
      -subj "/CN=pickserve.local"
  echo "Cert generated. Access from phone: https://${LOCAL_IP}:3443"
fi
