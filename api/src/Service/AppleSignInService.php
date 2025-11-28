<?php

namespace App\Service;

use Psr\Log\LoggerInterface;

/**
 * Service to verify Apple Sign-In tokens and handle Apple authentication
 *
 * Apple Sign-In uses JWT tokens signed with Apple's private keys.
 * We need to verify these tokens to authenticate users.
 */
class AppleSignInService
{
    private const APPLE_PUBLIC_KEYS_URL = 'https://appleid.apple.com/auth/keys';
    private const APPLE_TOKEN_ISSUER = 'https://appleid.apple.com';

    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly string $appleClientId,
        private readonly ?string $appleTeamId = null,
        private readonly ?string $appleKeyId = null,
    ) {
    }

    /**
     * Verify Apple Sign-In identity token
     *
     * @param string $identityToken The JWT token from Apple Sign-In
     * @return array{valid: bool, apple_id?: string, email?: string, email_verified?: bool, error?: string}
     */
    public function verifyIdentityToken(string $identityToken): array
    {
        try {
            // Decode the JWT token without verification first to get the header
            $tokenParts = explode('.', $identityToken);
            if (count($tokenParts) !== 3) {
                return [
                    'valid' => false,
                    'error' => 'Invalid token format',
                ];
            }

            // Decode header to get the key ID (kid)
            $header = json_decode(base64_decode(strtr($tokenParts[0], '-_', '+/')), true);
            if (!$header || !isset($header['kid'])) {
                return [
                    'valid' => false,
                    'error' => 'Invalid token header',
                ];
            }

            // Get Apple's public keys
            $publicKeys = $this->getApplePublicKeys();
            if (!isset($publicKeys[$header['kid']])) {
                return [
                    'valid' => false,
                    'error' => 'Public key not found',
                ];
            }

            // Verify the token signature
            $publicKey = $publicKeys[$header['kid']];
            $payload = $this->verifyJWT($identityToken, $publicKey);

            if (!$payload) {
                return [
                    'valid' => false,
                    'error' => 'Token signature verification failed',
                ];
            }

            // Verify token claims
            $validationResult = $this->validateTokenClaims($payload);
            if (!$validationResult['valid']) {
                return $validationResult;
            }

            // Extract user information
            return [
                'valid' => true,
                'apple_id' => $payload['sub'] ?? null,
                'email' => $payload['email'] ?? null,
                'email_verified' => ($payload['email_verified'] ?? 'false') === 'true',
                'is_private_email' => $payload['is_private_email'] ?? false,
            ];
        } catch (\Exception $e) {
            $this->logger->error('Apple Sign-In token verification failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'valid' => false,
                'error' => 'Token verification failed: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get Apple's public keys for JWT verification
     *
     * @return array<string, string> Array of public keys indexed by kid
     */
    private function getApplePublicKeys(): array
    {
        // In production, you should cache these keys
        // They don't change often, so caching for 24 hours is reasonable

        try {
            $response = file_get_contents(self::APPLE_PUBLIC_KEYS_URL);
            if ($response === false) {
                throw new \RuntimeException('Failed to fetch Apple public keys');
            }

            $keys = json_decode($response, true);
            if (!$keys || !isset($keys['keys'])) {
                throw new \RuntimeException('Invalid public keys response');
            }

            // Convert JWK to PEM format
            $publicKeys = [];
            foreach ($keys['keys'] as $key) {
                if (isset($key['kid'])) {
                    $publicKeys[$key['kid']] = $this->jwkToPem($key);
                }
            }

            return $publicKeys;
        } catch (\Exception $e) {
            $this->logger->error('Failed to get Apple public keys', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Convert JWK (JSON Web Key) to PEM format
     */
    private function jwkToPem(array $jwk): string
    {
        // This is a simplified version. In production, use a library like web-token/jwt-framework
        // or firebase/php-jwt that handles JWK to PEM conversion properly

        if (!isset($jwk['n']) || !isset($jwk['e'])) {
            throw new \InvalidArgumentException('Invalid JWK format');
        }

        // Decode base64url encoded values
        $n = $this->base64UrlDecode($jwk['n']);
        $e = $this->base64UrlDecode($jwk['e']);

        // Create RSA key components
        // Note: This is a placeholder. In production, use a proper crypto library
        throw new \RuntimeException(
            'JWK to PEM conversion requires a crypto library. ' .
            'Please install firebase/php-jwt or web-token/jwt-framework'
        );
    }

    /**
     * Verify JWT token signature
     *
     * @param string $token The JWT token
     * @param string $publicKey The public key in PEM format
     * @return array|null The payload if valid, null otherwise
     */
    private function verifyJWT(string $token, string $publicKey): ?array
    {
        // In production, use a proper JWT library like firebase/php-jwt
        // This is a placeholder implementation

        // Example with firebase/php-jwt (requires: composer require firebase/php-jwt)
        /*
        use Firebase\JWT\JWT;
        use Firebase\JWT\Key;

        try {
            $decoded = JWT::decode($token, new Key($publicKey, 'RS256'));
            return (array) $decoded;
        } catch (\Exception $e) {
            return null;
        }
        */

        throw new \RuntimeException(
            'JWT verification requires firebase/php-jwt library. ' .
            'Install with: composer require firebase/php-jwt'
        );
    }

    /**
     * Validate token claims
     *
     * @param array $payload The decoded token payload
     * @return array{valid: bool, error?: string}
     */
    private function validateTokenClaims(array $payload): array
    {
        // Verify issuer
        if (!isset($payload['iss']) || $payload['iss'] !== self::APPLE_TOKEN_ISSUER) {
            return [
                'valid' => false,
                'error' => 'Invalid token issuer',
            ];
        }

        // Verify audience (client ID)
        if (!isset($payload['aud']) || $payload['aud'] !== $this->appleClientId) {
            return [
                'valid' => false,
                'error' => 'Invalid token audience',
            ];
        }

        // Verify expiration
        if (!isset($payload['exp']) || $payload['exp'] < time()) {
            return [
                'valid' => false,
                'error' => 'Token expired',
            ];
        }

        // Verify issued at time (not too old, not in the future)
        if (isset($payload['iat'])) {
            $issuedAt = $payload['iat'];
            $now = time();

            // Token must not be issued in the future (allow 5 minutes clock skew)
            if ($issuedAt > $now + 300) {
                return [
                    'valid' => false,
                    'error' => 'Token issued in the future',
                ];
            }

            // Token must not be too old (e.g., more than 1 hour)
            if ($now - $issuedAt > 3600) {
                return [
                    'valid' => false,
                    'error' => 'Token too old',
                ];
            }
        }

        // Verify subject (Apple ID)
        if (!isset($payload['sub']) || empty($payload['sub'])) {
            return [
                'valid' => false,
                'error' => 'Missing subject (Apple ID)',
            ];
        }

        return ['valid' => true];
    }

    /**
     * Base64 URL decode
     */
    private function base64UrlDecode(string $input): string
    {
        $remainder = strlen($input) % 4;
        if ($remainder) {
            $padlen = 4 - $remainder;
            $input .= str_repeat('=', $padlen);
        }
        return base64_decode(strtr($input, '-_', '+/'));
    }

    /**
     * Generate a client secret for Apple Sign-In (server-to-server authentication)
     *
     * This is used for the authorization code flow, not needed for ID token validation
     */
    public function generateClientSecret(): string
    {
        // Requires: composer require firebase/php-jwt
        // and Apple Sign-In private key (.p8 file)

        throw new \RuntimeException(
            'Client secret generation requires additional setup. ' .
            'See Apple Sign-In documentation for details.'
        );
    }
}
