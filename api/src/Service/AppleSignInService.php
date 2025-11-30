<?php

namespace App\Service;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
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

    /** @var array<string, Key>|null Cached Apple public keys */
    private ?array $cachedPublicKeys = null;

    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly string $appleClientId,
        private readonly ?string $appleTeamId = null,
        private readonly ?string $appleKeyId = null,
        private readonly ?string $applePrivateKeyPath = null,
    ) {
    }

    /**
     * Verify Apple Sign-In identity token
     *
     * @param string $identityToken The JWT token from Apple Sign-In
     * @return array{valid: bool, apple_id?: string, email?: string, email_verified?: bool, is_private_email?: bool, error?: string}
     */
    public function verifyIdentityToken(string $identityToken): array
    {
        try {
            // Validate token format
            $tokenParts = explode('.', $identityToken);
            if (count($tokenParts) !== 3) {
                $this->logger->warning('Apple Sign-In: Invalid token format');
                return [
                    'valid' => false,
                    'error' => 'Invalid token format',
                ];
            }

            // Get Apple's public keys
            $publicKeys = $this->getApplePublicKeys();

            // Decode and verify the JWT using firebase/php-jwt
            try {
                $decoded = JWT::decode($identityToken, $publicKeys);
                $payload = (array) $decoded;
            } catch (\Firebase\JWT\ExpiredException $e) {
                $this->logger->warning('Apple Sign-In: Token expired', ['error' => $e->getMessage()]);
                return [
                    'valid' => false,
                    'error' => 'Token expired',
                ];
            } catch (\Firebase\JWT\SignatureInvalidException $e) {
                $this->logger->warning('Apple Sign-In: Invalid signature', ['error' => $e->getMessage()]);
                return [
                    'valid' => false,
                    'error' => 'Token signature verification failed',
                ];
            } catch (\Exception $e) {
                $this->logger->warning('Apple Sign-In: JWT decode failed', ['error' => $e->getMessage()]);
                return [
                    'valid' => false,
                    'error' => 'Token verification failed: ' . $e->getMessage(),
                ];
            }

            // Verify token claims
            $validationResult = $this->validateTokenClaims($payload);
            if (!$validationResult['valid']) {
                return $validationResult;
            }

            $this->logger->info('Apple Sign-In: Token verified successfully', [
                'apple_id' => $payload['sub'] ?? 'unknown',
                'email' => $payload['email'] ?? 'not provided',
            ]);

            // Extract user information
            return [
                'valid' => true,
                'apple_id' => $payload['sub'] ?? null,
                'email' => $payload['email'] ?? null,
                'email_verified' => $this->parseBoolean($payload['email_verified'] ?? false),
                'is_private_email' => $this->parseBoolean($payload['is_private_email'] ?? false),
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
     * Parse boolean value from Apple's response (can be string or bool)
     */
    private function parseBoolean(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_string($value)) {
            return strtolower($value) === 'true';
        }
        return (bool) $value;
    }

    /**
     * Get Apple's public keys for JWT verification
     *
     * @return array<string, Key> Array of Key objects for JWT verification
     */
    private function getApplePublicKeys(): array
    {
        // Return cached keys if available
        if ($this->cachedPublicKeys !== null) {
            return $this->cachedPublicKeys;
        }

        try {
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'header' => 'Accept: application/json',
                ],
            ]);

            $response = file_get_contents(self::APPLE_PUBLIC_KEYS_URL, false, $context);
            if ($response === false) {
                throw new \RuntimeException('Failed to fetch Apple public keys');
            }

            $jwks = json_decode($response, true);
            if (!$jwks || !isset($jwks['keys']) || empty($jwks['keys'])) {
                throw new \RuntimeException('Invalid public keys response from Apple');
            }

            // Use firebase/php-jwt JWK::parseKeySet to convert JWKs to Keys
            $this->cachedPublicKeys = JWK::parseKeySet($jwks, 'RS256');

            $this->logger->debug('Apple public keys fetched successfully', [
                'key_count' => count($this->cachedPublicKeys),
            ]);

            return $this->cachedPublicKeys;
        } catch (\Exception $e) {
            $this->logger->error('Failed to get Apple public keys', [
                'error' => $e->getMessage(),
            ]);
            throw new \RuntimeException('Failed to fetch Apple public keys: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Clear cached public keys (useful for testing or key rotation)
     */
    public function clearKeyCache(): void
    {
        $this->cachedPublicKeys = null;
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
     * Generate a client secret for Apple Sign-In (server-to-server authentication)
     *
     * Apple requires a JWT signed with your private key for server-to-server auth.
     * This is needed for the authorization code exchange flow.
     *
     * @return string The generated client secret (JWT)
     * @throws \RuntimeException If required configuration is missing
     */
    public function generateClientSecret(): string
    {
        if (empty($this->appleTeamId)) {
            throw new \RuntimeException('APPLE_TEAM_ID is required to generate client secret');
        }
        if (empty($this->appleKeyId)) {
            throw new \RuntimeException('APPLE_KEY_ID is required to generate client secret');
        }
        if (empty($this->applePrivateKeyPath)) {
            throw new \RuntimeException('APPLE_PRIVATE_KEY_PATH is required to generate client secret');
        }
        if (!file_exists($this->applePrivateKeyPath)) {
            throw new \RuntimeException('Apple private key file not found: ' . $this->applePrivateKeyPath);
        }

        $privateKey = file_get_contents($this->applePrivateKeyPath);
        if ($privateKey === false) {
            throw new \RuntimeException('Failed to read Apple private key file');
        }

        $now = time();
        $payload = [
            'iss' => $this->appleTeamId,
            'iat' => $now,
            'exp' => $now + 15777000, // 6 months (max allowed by Apple)
            'aud' => 'https://appleid.apple.com',
            'sub' => $this->appleClientId,
        ];

        try {
            return JWT::encode($payload, $privateKey, 'ES256', $this->appleKeyId);
        } catch (\Exception $e) {
            $this->logger->error('Failed to generate Apple client secret', [
                'error' => $e->getMessage(),
            ]);
            throw new \RuntimeException('Failed to generate client secret: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Exchange authorization code for tokens (optional - for refresh token flow)
     *
     * @param string $authorizationCode The authorization code from Apple
     * @return array The token response from Apple
     * @throws \RuntimeException If the exchange fails
     */
    public function exchangeAuthorizationCode(string $authorizationCode): array
    {
        $clientSecret = $this->generateClientSecret();

        $postData = [
            'client_id' => $this->appleClientId,
            'client_secret' => $clientSecret,
            'code' => $authorizationCode,
            'grant_type' => 'authorization_code',
        ];

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/x-www-form-urlencoded',
                'content' => http_build_query($postData),
                'timeout' => 30,
            ],
        ]);

        $response = file_get_contents('https://appleid.apple.com/auth/token', false, $context);
        if ($response === false) {
            throw new \RuntimeException('Failed to exchange authorization code with Apple');
        }

        $data = json_decode($response, true);
        if (!$data) {
            throw new \RuntimeException('Invalid response from Apple token endpoint');
        }

        if (isset($data['error'])) {
            throw new \RuntimeException('Apple token exchange failed: ' . ($data['error_description'] ?? $data['error']));
        }

        return $data;
    }

    /**
     * Check if Apple Sign-In is properly configured
     *
     * @return array{configured: bool, missing: string[]}
     */
    public function checkConfiguration(): array
    {
        $missing = [];

        if (empty($this->appleClientId)) {
            $missing[] = 'APPLE_CLIENT_ID';
        }

        // These are optional for basic ID token verification, but needed for full flow
        $optionalMissing = [];
        if (empty($this->appleTeamId)) {
            $optionalMissing[] = 'APPLE_TEAM_ID';
        }
        if (empty($this->appleKeyId)) {
            $optionalMissing[] = 'APPLE_KEY_ID';
        }
        if (empty($this->applePrivateKeyPath)) {
            $optionalMissing[] = 'APPLE_PRIVATE_KEY_PATH';
        }

        return [
            'configured' => empty($missing),
            'missing' => $missing,
            'optional_missing' => $optionalMissing,
        ];
    }
}
