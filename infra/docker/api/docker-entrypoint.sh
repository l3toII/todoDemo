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
echo "Warming up Symfony cache for APP_ENV=${APP_ENV:-prod}..."
cd /var/www/html
php bin/console cache:clear --env="${APP_ENV:-prod}" || echo "Cache clear failed, continuing..."
php bin/console cache:warmup --env="${APP_ENV:-prod}" || echo "Cache warmup failed, continuing..."

# Run database migrations
echo "Running database migrations..."
php bin/console doctrine:migrations:migrate --no-interaction --env="${APP_ENV:-prod}" || echo "Migrations failed, continuing..."

chown -R www-data:www-data /var/www/html/var

# Start supervisord (nginx + php-fpm)
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
