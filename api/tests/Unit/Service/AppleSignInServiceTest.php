<?php

namespace App\Tests\Unit\Service;

use App\Service\AppleSignInService;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

/**
 * Unit tests for AppleSignInService
 *
 * Note: Full testing of this service requires firebase/php-jwt library
 * These tests cover the basic validation logic and error handling
 */
class AppleSignInServiceTest extends TestCase
{
    private LoggerInterface $logger;
    private AppleSignInService $service;

    protected function setUp(): void
    {
        $this->logger = $this->createMock(LoggerInterface::class);
        $this->service = new AppleSignInService(
            $this->logger,
            'com.example.app', // clientId
            'TEAM_ID',
            'KEY_ID'
        );
    }

    // =========================================================================
    // Token Format Validation Tests
    // =========================================================================

    public function testVerifyIdentityTokenWithInvalidFormat(): void
    {
        $result = $this->service->verifyIdentityToken('invalid_token');

        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('error', $result);
        $this->assertEquals('Invalid token format', $result['error']);
    }

    public function testVerifyIdentityTokenWithTwoPartToken(): void
    {
        $result = $this->service->verifyIdentityToken('part1.part2');

        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('error', $result);
    }

    public function testVerifyIdentityTokenWithEmptyString(): void
    {
        $result = $this->service->verifyIdentityToken('');

        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('error', $result);
    }

    // =========================================================================
    // Token Claims Validation Tests
    // =========================================================================

    public function testValidateTokenClaimsWithMissingIssuer(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('validateTokenClaims');
        $method->setAccessible(true);

        $payload = [
            'aud' => 'com.example.app',
            'exp' => time() + 3600,
            'sub' => 'user_id',
        ];

        $result = $method->invoke($this->service, $payload);

        $this->assertFalse($result['valid']);
        $this->assertEquals('Invalid token issuer', $result['error']);
    }

    public function testValidateTokenClaimsWithInvalidIssuer(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('validateTokenClaims');
        $method->setAccessible(true);

        $payload = [
            'iss' => 'https://wrong-issuer.com',
            'aud' => 'com.example.app',
            'exp' => time() + 3600,
            'sub' => 'user_id',
        ];

        $result = $method->invoke($this->service, $payload);

        $this->assertFalse($result['valid']);
        $this->assertEquals('Invalid token issuer', $result['error']);
    }

    public function testValidateTokenClaimsWithInvalidAudience(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('validateTokenClaims');
        $method->setAccessible(true);

        $payload = [
            'iss' => 'https://appleid.apple.com',
            'aud' => 'com.wrong.app',
            'exp' => time() + 3600,
            'sub' => 'user_id',
        ];

        $result = $method->invoke($this->service, $payload);

        $this->assertFalse($result['valid']);
        $this->assertEquals('Invalid token audience', $result['error']);
    }

    public function testValidateTokenClaimsWithExpiredToken(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('validateTokenClaims');
        $method->setAccessible(true);

        $payload = [
            'iss' => 'https://appleid.apple.com',
            'aud' => 'com.example.app',
            'exp' => time() - 3600, // Expired 1 hour ago
            'sub' => 'user_id',
        ];

        $result = $method->invoke($this->service, $payload);

        $this->assertFalse($result['valid']);
        $this->assertEquals('Token expired', $result['error']);
    }

    public function testValidateTokenClaimsWithFutureIssuedAt(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('validateTokenClaims');
        $method->setAccessible(true);

        $payload = [
            'iss' => 'https://appleid.apple.com',
            'aud' => 'com.example.app',
            'exp' => time() + 3600,
            'iat' => time() + 400, // Issued 400 seconds in the future (beyond 5 min skew)
            'sub' => 'user_id',
        ];

        $result = $method->invoke($this->service, $payload);

        $this->assertFalse($result['valid']);
        $this->assertEquals('Token issued in the future', $result['error']);
    }

    public function testValidateTokenClaimsWithTooOldToken(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('validateTokenClaims');
        $method->setAccessible(true);

        $payload = [
            'iss' => 'https://appleid.apple.com',
            'aud' => 'com.example.app',
            'exp' => time() + 3600,
            'iat' => time() - 3700, // Issued more than 1 hour ago
            'sub' => 'user_id',
        ];

        $result = $method->invoke($this->service, $payload);

        $this->assertFalse($result['valid']);
        $this->assertEquals('Token too old', $result['error']);
    }

    public function testValidateTokenClaimsWithMissingSubject(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('validateTokenClaims');
        $method->setAccessible(true);

        $payload = [
            'iss' => 'https://appleid.apple.com',
            'aud' => 'com.example.app',
            'exp' => time() + 3600,
        ];

        $result = $method->invoke($this->service, $payload);

        $this->assertFalse($result['valid']);
        $this->assertEquals('Missing subject (Apple ID)', $result['error']);
    }

    public function testValidateTokenClaimsWithEmptySubject(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('validateTokenClaims');
        $method->setAccessible(true);

        $payload = [
            'iss' => 'https://appleid.apple.com',
            'aud' => 'com.example.app',
            'exp' => time() + 3600,
            'sub' => '',
        ];

        $result = $method->invoke($this->service, $payload);

        $this->assertFalse($result['valid']);
        $this->assertEquals('Missing subject (Apple ID)', $result['error']);
    }

    public function testValidateTokenClaimsWithValidPayload(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('validateTokenClaims');
        $method->setAccessible(true);

        $payload = [
            'iss' => 'https://appleid.apple.com',
            'aud' => 'com.example.app',
            'exp' => time() + 3600,
            'iat' => time() - 100,
            'sub' => 'user_apple_id',
        ];

        $result = $method->invoke($this->service, $payload);

        $this->assertTrue($result['valid']);
        $this->assertArrayNotHasKey('error', $result);
    }

    public function testValidateTokenClaimsWithClockSkewAllowance(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('validateTokenClaims');
        $method->setAccessible(true);

        $payload = [
            'iss' => 'https://appleid.apple.com',
            'aud' => 'com.example.app',
            'exp' => time() + 3600,
            'iat' => time() + 250, // Within 5 minute skew
            'sub' => 'user_apple_id',
        ];

        $result = $method->invoke($this->service, $payload);

        $this->assertTrue($result['valid']);
    }

    // =========================================================================
    // Error Handling Tests
    // =========================================================================

    public function testVerifyIdentityTokenWithValidationErrors(): void
    {
        // Test that validation errors are returned without logging
        // (logging only happens on exceptions)
        $result = $this->service->verifyIdentityToken('invalid');

        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('error', $result);
        $this->assertEquals('Invalid token format', $result['error']);
    }

    // =========================================================================
    // Configuration Tests
    // =========================================================================

    public function testGenerateClientSecretRequiresPrivateKeyPath(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('APPLE_PRIVATE_KEY_PATH is required to generate client secret');

        $this->service->generateClientSecret();
    }

    public function testCheckConfigurationWithValidConfig(): void
    {
        $result = $this->service->checkConfiguration();

        $this->assertTrue($result['configured']);
        $this->assertEmpty($result['missing']);
        $this->assertArrayHasKey('optional_missing', $result);
    }

    public function testCheckConfigurationWithMissingClientId(): void
    {
        $service = new AppleSignInService(
            $this->logger,
            '', // Empty client ID
            'TEAM_ID',
            'KEY_ID'
        );

        $result = $service->checkConfiguration();

        $this->assertFalse($result['configured']);
        $this->assertContains('APPLE_CLIENT_ID', $result['missing']);
    }

    public function testClearKeyCache(): void
    {
        // Just verify the method exists and doesn't throw
        $this->service->clearKeyCache();
        $this->assertTrue(true);
    }

    // =========================================================================
    // Boolean Parsing Tests
    // =========================================================================

    public function testParseBooleanWithBooleanTrue(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('parseBoolean');
        $method->setAccessible(true);

        $this->assertTrue($method->invoke($this->service, true));
    }

    public function testParseBooleanWithBooleanFalse(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('parseBoolean');
        $method->setAccessible(true);

        $this->assertFalse($method->invoke($this->service, false));
    }

    public function testParseBooleanWithStringTrue(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('parseBoolean');
        $method->setAccessible(true);

        $this->assertTrue($method->invoke($this->service, 'true'));
        $this->assertTrue($method->invoke($this->service, 'TRUE'));
        $this->assertTrue($method->invoke($this->service, 'True'));
    }

    public function testParseBooleanWithStringFalse(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('parseBoolean');
        $method->setAccessible(true);

        $this->assertFalse($method->invoke($this->service, 'false'));
        $this->assertFalse($method->invoke($this->service, 'FALSE'));
        $this->assertFalse($method->invoke($this->service, ''));
    }
}
