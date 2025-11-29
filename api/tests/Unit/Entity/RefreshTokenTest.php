<?php

namespace App\Tests\Unit\Entity;

use App\Entity\RefreshToken;
use App\Entity\User;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

class RefreshTokenTest extends TestCase
{
    private User $user;

    protected function setUp(): void
    {
        $this->user = new User();
        $this->user->setEmail('test@example.com');
    }

    // =========================================================================
    // Creation Tests
    // =========================================================================

    public function testRefreshTokenCreation(): void
    {
        $tokenHash = RefreshToken::hashToken('plain_token');
        $expiresAt = new \DateTimeImmutable('+30 days');

        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        $this->assertInstanceOf(Uuid::class, $refreshToken->getId());
        $this->assertSame($this->user, $refreshToken->getUser());
        $this->assertEquals($tokenHash, $refreshToken->getTokenHash());
        $this->assertEquals($expiresAt, $refreshToken->getExpiresAt());
        $this->assertInstanceOf(\DateTimeImmutable::class, $refreshToken->getCreatedAt());
        $this->assertNull($refreshToken->getRevokedAt());
        $this->assertNull($refreshToken->getDeviceInfo());
    }

    public function testRefreshTokenWithDateTime(): void
    {
        $tokenHash = RefreshToken::hashToken('token');
        $expiresAt = new \DateTime('+30 days');

        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        // Should convert DateTime to DateTimeImmutable
        $this->assertInstanceOf(\DateTimeImmutable::class, $refreshToken->getExpiresAt());
    }

    // =========================================================================
    // Device Info Tests
    // =========================================================================

    public function testDeviceInfoGetterSetter(): void
    {
        $tokenHash = RefreshToken::hashToken('token');
        $expiresAt = new \DateTimeImmutable('+30 days');
        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        $deviceInfo = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
        $refreshToken->setDeviceInfo($deviceInfo);

        $this->assertEquals($deviceInfo, $refreshToken->getDeviceInfo());
    }

    public function testDeviceInfoIsNullByDefault(): void
    {
        $tokenHash = RefreshToken::hashToken('token');
        $expiresAt = new \DateTimeImmutable('+30 days');
        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        $this->assertNull($refreshToken->getDeviceInfo());
    }

    // =========================================================================
    // Expiration Tests
    // =========================================================================

    public function testIsExpiredWhenNotExpired(): void
    {
        $tokenHash = RefreshToken::hashToken('token');
        $expiresAt = new \DateTimeImmutable('+30 days');
        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        $this->assertFalse($refreshToken->isExpired());
    }

    public function testIsExpiredWhenExpired(): void
    {
        $tokenHash = RefreshToken::hashToken('token');
        $expiresAt = new \DateTimeImmutable('-1 day');
        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        $this->assertTrue($refreshToken->isExpired());
    }

    public function testIsExpiredAtExactMoment(): void
    {
        $tokenHash = RefreshToken::hashToken('token');
        $expiresAt = new \DateTimeImmutable('now');
        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        // At exact expiration time, should be expired (< comparison)
        $this->assertTrue($refreshToken->isExpired());
    }

    // =========================================================================
    // Revocation Tests
    // =========================================================================

    public function testIsRevokedWhenNotRevoked(): void
    {
        $tokenHash = RefreshToken::hashToken('token');
        $expiresAt = new \DateTimeImmutable('+30 days');
        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        $this->assertFalse($refreshToken->isRevoked());
        $this->assertNull($refreshToken->getRevokedAt());
    }

    public function testRevoke(): void
    {
        $tokenHash = RefreshToken::hashToken('token');
        $expiresAt = new \DateTimeImmutable('+30 days');
        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        $beforeRevoke = new \DateTimeImmutable();
        $refreshToken->revoke();
        $afterRevoke = new \DateTimeImmutable();

        $this->assertTrue($refreshToken->isRevoked());
        $this->assertNotNull($refreshToken->getRevokedAt());
        $this->assertGreaterThanOrEqual($beforeRevoke, $refreshToken->getRevokedAt());
        $this->assertLessThanOrEqual($afterRevoke, $refreshToken->getRevokedAt());
    }

    public function testRevokeReturnsThis(): void
    {
        $tokenHash = RefreshToken::hashToken('token');
        $expiresAt = new \DateTimeImmutable('+30 days');
        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        $result = $refreshToken->revoke();

        $this->assertSame($refreshToken, $result);
    }

    // =========================================================================
    // Validation Tests
    // =========================================================================

    public function testIsValidWhenValid(): void
    {
        $tokenHash = RefreshToken::hashToken('token');
        $expiresAt = new \DateTimeImmutable('+30 days');
        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        $this->assertTrue($refreshToken->isValid());
    }

    public function testIsValidWhenExpired(): void
    {
        $tokenHash = RefreshToken::hashToken('token');
        $expiresAt = new \DateTimeImmutable('-1 day');
        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        $this->assertFalse($refreshToken->isValid());
    }

    public function testIsValidWhenRevoked(): void
    {
        $tokenHash = RefreshToken::hashToken('token');
        $expiresAt = new \DateTimeImmutable('+30 days');
        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);
        $refreshToken->revoke();

        $this->assertFalse($refreshToken->isValid());
    }

    public function testIsValidWhenExpiredAndRevoked(): void
    {
        $tokenHash = RefreshToken::hashToken('token');
        $expiresAt = new \DateTimeImmutable('-1 day');
        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);
        $refreshToken->revoke();

        $this->assertFalse($refreshToken->isValid());
    }

    // =========================================================================
    // Token Generation Tests
    // =========================================================================

    public function testGenerateTokenLength(): void
    {
        $token = RefreshToken::generateToken();

        // Should be 64 characters (32 bytes in hex)
        $this->assertEquals(64, strlen($token));
    }

    public function testGenerateTokenIsHex(): void
    {
        $token = RefreshToken::generateToken();

        // Should only contain hex characters
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $token);
    }

    public function testGenerateTokenIsUnique(): void
    {
        $token1 = RefreshToken::generateToken();
        $token2 = RefreshToken::generateToken();

        $this->assertNotEquals($token1, $token2);
    }

    // =========================================================================
    // Token Hashing Tests
    // =========================================================================

    public function testHashTokenProducesSha256(): void
    {
        $plainToken = 'my_plain_token';
        $hash = RefreshToken::hashToken($plainToken);

        // SHA-256 produces 64 character hex string
        $this->assertEquals(64, strlen($hash));
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $hash);
    }

    public function testHashTokenIsConsistent(): void
    {
        $plainToken = 'my_plain_token';

        $hash1 = RefreshToken::hashToken($plainToken);
        $hash2 = RefreshToken::hashToken($plainToken);

        $this->assertEquals($hash1, $hash2);
    }

    public function testHashTokenIsDifferentForDifferentInputs(): void
    {
        $hash1 = RefreshToken::hashToken('token1');
        $hash2 = RefreshToken::hashToken('token2');

        $this->assertNotEquals($hash1, $hash2);
    }

    public function testHashTokenMatchesPhpHash(): void
    {
        $plainToken = 'test_token';
        $hash = RefreshToken::hashToken($plainToken);

        $this->assertEquals(hash('sha256', $plainToken), $hash);
    }

    // =========================================================================
    // Token Verification Tests
    // =========================================================================

    public function testVerifyWithCorrectToken(): void
    {
        $plainToken = RefreshToken::generateToken();
        $tokenHash = RefreshToken::hashToken($plainToken);
        $expiresAt = new \DateTimeImmutable('+30 days');

        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        $this->assertTrue($refreshToken->verify($plainToken));
    }

    public function testVerifyWithIncorrectToken(): void
    {
        $plainToken = RefreshToken::generateToken();
        $tokenHash = RefreshToken::hashToken($plainToken);
        $expiresAt = new \DateTimeImmutable('+30 days');

        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        $this->assertFalse($refreshToken->verify('wrong_token'));
    }

    public function testVerifyWithEmptyToken(): void
    {
        $plainToken = RefreshToken::generateToken();
        $tokenHash = RefreshToken::hashToken($plainToken);
        $expiresAt = new \DateTimeImmutable('+30 days');

        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        $this->assertFalse($refreshToken->verify(''));
    }

    // =========================================================================
    // User Association Tests
    // =========================================================================

    public function testUserAssociation(): void
    {
        $user = new User();
        $user->setEmail('user@example.com');

        $tokenHash = RefreshToken::hashToken('token');
        $expiresAt = new \DateTimeImmutable('+30 days');
        $refreshToken = new RefreshToken($user, $tokenHash, $expiresAt);

        $this->assertSame($user, $refreshToken->getUser());
        $this->assertEquals('user@example.com', $refreshToken->getUser()->getEmail());
    }

    // =========================================================================
    // Timestamps Tests
    // =========================================================================

    public function testCreatedAtIsSetOnCreation(): void
    {
        $before = new \DateTimeImmutable();

        $tokenHash = RefreshToken::hashToken('token');
        $expiresAt = new \DateTimeImmutable('+30 days');
        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        $after = new \DateTimeImmutable();

        $this->assertGreaterThanOrEqual($before, $refreshToken->getCreatedAt());
        $this->assertLessThanOrEqual($after, $refreshToken->getCreatedAt());
    }

    public function testExpiresAtIsImmutable(): void
    {
        $expiresAt = new \DateTimeImmutable('+30 days');
        $tokenHash = RefreshToken::hashToken('token');
        $refreshToken = new RefreshToken($this->user, $tokenHash, $expiresAt);

        $retrievedExpiresAt = $refreshToken->getExpiresAt();

        $this->assertEquals($expiresAt, $retrievedExpiresAt);
        $this->assertInstanceOf(\DateTimeImmutable::class, $retrievedExpiresAt);
    }
}
