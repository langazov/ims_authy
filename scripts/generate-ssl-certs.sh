#!/bin/bash

# Generate SSL certificates for local development
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CERTS_DIR="$PROJECT_ROOT/certs"

echo "Creating SSL certificates for local development..."

# Create certs directory
mkdir -p "$CERTS_DIR"

# Generate CA private key
echo "Generating CA private key..."
openssl genrsa -out "$CERTS_DIR/ca-key.pem" 4096

# Generate CA certificate
echo "Generating CA certificate..."
openssl req -new -x509 -days 365 -key "$CERTS_DIR/ca-key.pem" -sha256 -out "$CERTS_DIR/ca-cert.pem" -subj "/C=US/ST=CA/L=San Francisco/O=Local Development/CN=Local CA"

# Generate server private key
echo "Generating server private key..."
openssl genrsa -out "$CERTS_DIR/server-key.pem" 4096

# Generate server certificate signing request
echo "Generating server certificate signing request..."
openssl req -subj "/C=US/ST=CA/L=San Francisco/O=Local Development/CN=*.docker.local" -sha256 -new -key "$CERTS_DIR/server-key.pem" -out "$CERTS_DIR/server.csr"

# Create extensions file for server certificate
cat > "$CERTS_DIR/server-extfile.cnf" << EOF
subjectAltName = DNS:authy.docker.local,DNS:oauth2.docker.local,DNS:*.docker.local,DNS:localhost,IP:127.0.0.1
extendedKeyUsage = serverAuth
EOF

# Generate server certificate
echo "Generating server certificate..."
openssl x509 -req -days 365 -in "$CERTS_DIR/server.csr" -CA "$CERTS_DIR/ca-cert.pem" -CAkey "$CERTS_DIR/ca-key.pem" -out "$CERTS_DIR/server-cert.pem" -extfile "$CERTS_DIR/server-extfile.cnf" -CAcreateserial

# Clean up
rm "$CERTS_DIR/server.csr" "$CERTS_DIR/server-extfile.cnf"

# Set appropriate permissions
chmod 444 "$CERTS_DIR/ca-cert.pem" "$CERTS_DIR/server-cert.pem"
chmod 400 "$CERTS_DIR/ca-key.pem" "$CERTS_DIR/server-key.pem"

echo ""
echo "SSL certificates generated successfully!"
echo ""
echo "Certificates created in: $CERTS_DIR"
echo "- ca-cert.pem (Certificate Authority)"
echo "- ca-key.pem (CA Private Key)"
echo "- server-cert.pem (Server Certificate)"
echo "- server-key.pem (Server Private Key)"
echo ""
echo "To trust the certificates in your browser:"
echo "1. Import ca-cert.pem into your browser's trusted root certificates"
echo "2. For macOS: sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERTS_DIR/ca-cert.pem"
echo "3. For Linux: sudo cp $CERTS_DIR/ca-cert.pem /usr/local/share/ca-certificates/local-ca.crt && sudo update-ca-certificates"
echo ""
echo "The certificates are valid for:"
echo "- authy.docker.local"
echo "- oauth2.docker.local"
echo "- *.docker.local"
echo "- localhost"
echo "- 127.0.0.1"