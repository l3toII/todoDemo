#!/bin/bash
set -e

JWT_DIR="/var/www/html/config/jwt"

# Generate JWT keys if they don't exist and JWT_PASSPHRASE is set
if [ -n "$JWT_PASSPHRASE" ] && [ ! -f "$JWT_DIR/private.pem" ]; then
    echo "Generating JWT keys..."
    mkdir -p "$JWT_DIR"

    # Generate private key
    openssl genpkey -out "$JWT_DIR/private.pem" -aes256 -algorithm rsa -pkeyopt rsa_keygen_bits:4096 -pass "pass:$JWT_PASSPHRASE"

    # Generate public key from private key
    openssl pkey -in "$JWT_DIR/private.pem" -out "$JWT_DIR/public.pem" -pubout -passin "pass:$JWT_PASSPHRASE"

    # Set permissions
    chmod 600 "$JWT_DIR/private.pem"
    chmod 644 "$JWT_DIR/public.pem"
    chown -R www-data:www-data "$JWT_DIR"

    echo "JWT keys generated successfully"
fi

# Clear and warm up Symfony cache
echo "Warming up Symfony cache..."
cd /var/www/html
php bin/console cache:clear --env=prod --no-debug 2>/dev/null || true
php bin/console cache:warmup --env=prod --no-debug 2>/dev/null || true
chown -R www-data:www-data /var/www/html/var

# Start supervisord (nginx + php-fpm)
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
