<?php

namespace App\Tests\Unit\Repository;

use App\Entity\RefreshToken;
use App\Entity\User;
use App\Repository\RefreshTokenRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class RefreshTokenRepositoryTest extends KernelTestCase
{
    private EntityManagerInterface $entityManager;
    private RefreshTokenRepository $refreshTokenRepository;
    private UserRepository $userRepository;
    private User $testUser;

    protected function setUp(): void
    {
        $kernel = self::bootKernel();
        $this->entityManager = $kernel->getContainer()
            ->get('doctrine')
            ->getManager();

        $this->refreshTokenRepository = $this->entityManager->getRepository(RefreshToken::class);
        $this->userRepository = $this->entityManager->getRepository(User::class);

        // Clean database
        $this->cleanDatabase();

        // Create test user
        $this->testUser = new User();
        $this->testUser->setEmail('testuser@example.com');
        $this->testUser->setPasswordHash('hashed_password');
        $this->userRepository->save($this->testUser);
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        $this->cleanDatabase();
        $this->entityManager->close();
    }

    private function cleanDatabase(): void
    {
        $connection = $this->entityManager->getConnection();
        $connection->executeStatement('DELETE FROM refresh_tokens');
        $connection->executeStatement('DELETE FROM users');
    }

    // =========================================================================
    // CRUD Tests
    // =========================================================================

    public function testSave(): void
    {
        $tokenHash = RefreshToken::hashToken('plain_token');
        $expiresAt = new \DateTimeImmutable('+30 days');
        $refreshToken = new RefreshToken($this->testUser, $tokenHash, $expiresAt);

        $this->refreshTokenRepository->save($refreshToken);

        $this->assertNotNull($refreshToken->getId());

        // Verify it's in the database
        $found = $this->refreshTokenRepository->find($refreshToken->getId());
        $this->assertNotNull($found);
    }

    public function testSaveWithoutFlush(): void
    {
        $tokenHash = RefreshToken::hashToken('plain_token');
        $expiresAt = new \DateTimeImmutable('+30 days');
        $refreshToken = new RefreshToken($this->testUser, $tokenHash, $expiresAt);

        $this->refreshTokenRepository->save($refreshToken, flush: false);
        $this->entityManager->flush();

        $found = $this->refreshTokenRepository->find($refreshToken->getId());
        $this->assertNotNull($found);
    }

    public function testRemove(): void
    {
        $refreshToken = $this->createTestToken();
        $tokenId = $refreshToken->getId();

        $this->refreshTokenRepository->remove($refreshToken);

        $found = $this->refreshTokenRepository->find($tokenId);
        $this->assertNull($found);
    }

    public function testRemoveWithoutFlush(): void
    {
        $refreshToken = $this->createTestToken();
        $tokenId = $refreshToken->getId();

        $this->refreshTokenRepository->remove($refreshToken, flush: false);

        // Should still exist before flush
        $found = $this->refreshTokenRepository->find($tokenId);
        $this->assertNotNull($found);

        $this->entityManager->flush();

        // Should be gone after flush
        $found = $this->refreshTokenRepository->find($tokenId);
        $this->assertNull($found);
    }

    // =========================================================================
    // Find Valid By Hash Tests
    // =========================================================================

    public function testFindValidByHashWithValidToken(): void
    {
        $plainToken = RefreshToken::generateToken();
        $tokenHash = RefreshToken::hashToken($plainToken);
        $expiresAt = new \DateTimeImmutable('+30 days');

        $refreshToken = new RefreshToken($this->testUser, $tokenHash, $expiresAt);
        $this->refreshTokenRepository->save($refreshToken);

        $found = $this->refreshTokenRepository->findValidByHash($tokenHash);

        $this->assertNotNull($found);
        $this->assertEquals($refreshToken->getId(), $found->getId());
    }

    public function testFindValidByHashNotFound(): void
    {
        $found = $this->refreshTokenRepository->findValidByHash('nonexistent_hash');

        $this->assertNull($found);
    }

    public function testFindValidByHashIgnoresExpiredTokens(): void
    {
        $plainToken = RefreshToken::generateToken();
        $tokenHash = RefreshToken::hashToken($plainToken);
        $expiresAt = new \DateTimeImmutable('-1 day'); // Expired

        $refreshToken = new RefreshToken($this->testUser, $tokenHash, $expiresAt);
        $this->refreshTokenRepository->save($refreshToken);

        $found = $this->refreshTokenRepository->findValidByHash($tokenHash);

        $this->assertNull($found);
    }

    public function testFindValidByHashIgnoresRevokedTokens(): void
    {
        $plainToken = RefreshToken::generateToken();
        $tokenHash = RefreshToken::hashToken($plainToken);
        $expiresAt = new \DateTimeImmutable('+30 days');

        $refreshToken = new RefreshToken($this->testUser, $tokenHash, $expiresAt);
        $refreshToken->revoke();
        $this->refreshTokenRepository->save($refreshToken);

        $found = $this->refreshTokenRepository->findValidByHash($tokenHash);

        $this->assertNull($found);
    }

    public function testFindValidByHashIgnoresExpiredAndRevoked(): void
    {
        $plainToken = RefreshToken::generateToken();
        $tokenHash = RefreshToken::hashToken($plainToken);
        $expiresAt = new \DateTimeImmutable('-1 day');

        $refreshToken = new RefreshToken($this->testUser, $tokenHash, $expiresAt);
        $refreshToken->revoke();
        $this->refreshTokenRepository->save($refreshToken);

        $found = $this->refreshTokenRepository->findValidByHash($tokenHash);

        $this->assertNull($found);
    }

    // =========================================================================
    // Revoke All For User Tests
    // =========================================================================

    public function testRevokeAllForUser(): void
    {
        // Create multiple tokens for the test user
        $token1 = $this->createTestToken();
        $token2 = $this->createTestToken();

        // Create token for different user
        $otherUser = new User();
        $otherUser->setEmail('other@example.com');
        $otherUser->setPasswordHash('password');
        $this->userRepository->save($otherUser);

        $tokenHash = RefreshToken::hashToken('other_token');
        $expiresAt = new \DateTimeImmutable('+30 days');
        $otherToken = new RefreshToken($otherUser, $tokenHash, $expiresAt);
        $this->refreshTokenRepository->save($otherToken);

        // Revoke all for test user
        $this->refreshTokenRepository->revokeAllForUser($this->testUser);
        $this->entityManager->clear(); // Clear to force fresh fetch

        // Check that test user tokens are revoked
        $found1 = $this->refreshTokenRepository->find($token1->getId());
        $found2 = $this->refreshTokenRepository->find($token2->getId());

        $this->assertNotNull($found1);
        $this->assertTrue($found1->isRevoked());

        $this->assertNotNull($found2);
        $this->assertTrue($found2->isRevoked());

        // Check that other user token is NOT revoked
        $foundOther = $this->refreshTokenRepository->find($otherToken->getId());
        $this->assertNotNull($foundOther);
        $this->assertFalse($foundOther->isRevoked());
    }

    public function testRevokeAllForUserWithNoTokens(): void
    {
        // Should not throw error
        $this->refreshTokenRepository->revokeAllForUser($this->testUser);

        $this->assertTrue(true); // Assert test passes
    }

    public function testRevokeAllForUserDoesNotRevokeAlreadyRevoked(): void
    {
        $token = $this->createTestToken();
        $originalRevokedAt = new \DateTimeImmutable('-1 hour');

        // Manually set revoked time
        $reflection = new \ReflectionClass($token);
        $property = $reflection->getProperty('revokedAt');
        $property->setAccessible(true);
        $property->setValue($token, $originalRevokedAt);

        $this->entityManager->persist($token);
        $this->entityManager->flush();

        // Revoke all
        $this->refreshTokenRepository->revokeAllForUser($this->testUser);
        $this->entityManager->clear();

        // Should not update already revoked token
        $found = $this->refreshTokenRepository->find($token->getId());
        $this->assertEquals($originalRevokedAt->getTimestamp(), $found->getRevokedAt()->getTimestamp(), '', 2);
    }

    // =========================================================================
    // Delete Expired Tests
    // =========================================================================

    public function testDeleteExpired(): void
    {
        // Create expired token
        $expiredHash = RefreshToken::hashToken('expired');
        $expired = new RefreshToken($this->testUser, $expiredHash, new \DateTimeImmutable('-1 day'));
        $this->refreshTokenRepository->save($expired);

        // Create valid token
        $validHash = RefreshToken::hashToken('valid');
        $valid = new RefreshToken($this->testUser, $validHash, new \DateTimeImmutable('+30 days'));
        $this->refreshTokenRepository->save($valid);

        $deletedCount = $this->refreshTokenRepository->deleteExpired();
        $this->entityManager->clear(); // Clear to force fresh fetch

        $this->assertEquals(1, $deletedCount);

        // Verify expired is deleted
        $foundExpired = $this->refreshTokenRepository->find($expired->getId());
        $this->assertNull($foundExpired);

        // Verify valid still exists
        $foundValid = $this->refreshTokenRepository->find($valid->getId());
        $this->assertNotNull($foundValid);
    }

    public function testDeleteExpiredWithNoExpiredTokens(): void
    {
        $valid = $this->createTestToken();

        $deletedCount = $this->refreshTokenRepository->deleteExpired();

        $this->assertEquals(0, $deletedCount);

        // Verify valid still exists
        $found = $this->refreshTokenRepository->find($valid->getId());
        $this->assertNotNull($found);
    }

    // =========================================================================
    // Delete Revoked Older Than Tests
    // =========================================================================

    public function testDeleteRevokedOlderThan(): void
    {
        // Create old revoked token
        $oldHash = RefreshToken::hashToken('old_revoked');
        $oldToken = new RefreshToken($this->testUser, $oldHash, new \DateTimeImmutable('+30 days'));

        // Manually set old revoked time
        $reflection = new \ReflectionClass($oldToken);
        $property = $reflection->getProperty('revokedAt');
        $property->setAccessible(true);
        $property->setValue($oldToken, new \DateTimeImmutable('-10 days'));

        $this->entityManager->persist($oldToken);
        $this->entityManager->flush();

        // Create recent revoked token
        $recentHash = RefreshToken::hashToken('recent_revoked');
        $recentToken = new RefreshToken($this->testUser, $recentHash, new \DateTimeImmutable('+30 days'));
        $recentToken->revoke();
        $this->refreshTokenRepository->save($recentToken);

        // Create non-revoked token
        $activeToken = $this->createTestToken();

        // Delete revoked older than 7 days
        $deletedCount = $this->refreshTokenRepository->deleteRevokedOlderThan(new \DateTimeImmutable('-7 days'));
        $this->entityManager->clear(); // Clear to force fresh fetch

        $this->assertEquals(1, $deletedCount);

        // Verify old revoked is deleted
        $foundOld = $this->refreshTokenRepository->find($oldToken->getId());
        $this->assertNull($foundOld);

        // Verify recent revoked still exists
        $foundRecent = $this->refreshTokenRepository->find($recentToken->getId());
        $this->assertNotNull($foundRecent);

        // Verify active still exists
        $foundActive = $this->refreshTokenRepository->find($activeToken->getId());
        $this->assertNotNull($foundActive);
    }

    public function testDeleteRevokedOlderThanWithNoOldRevoked(): void
    {
        $recentToken = $this->createTestToken();
        $recentToken->revoke();
        $this->refreshTokenRepository->save($recentToken);

        $deletedCount = $this->refreshTokenRepository->deleteRevokedOlderThan(new \DateTimeImmutable('-7 days'));

        $this->assertEquals(0, $deletedCount);
    }

    // =========================================================================
    // Multiple Tokens Tests
    // =========================================================================

    public function testMultipleTokensForSameUser(): void
    {
        $token1 = $this->createTestToken();
        $token2 = $this->createTestToken();
        $token3 = $this->createTestToken();

        $tokens = $this->refreshTokenRepository->findBy(['user' => $this->testUser]);

        $this->assertCount(3, $tokens);
    }

    public function testFindByUserReturnsCorrectTokens(): void
    {
        $token1 = $this->createTestToken();

        $otherUser = new User();
        $otherUser->setEmail('other@example.com');
        $otherUser->setPasswordHash('password');
        $this->userRepository->save($otherUser);

        $otherHash = RefreshToken::hashToken('other');
        $otherToken = new RefreshToken($otherUser, $otherHash, new \DateTimeImmutable('+30 days'));
        $this->refreshTokenRepository->save($otherToken);

        $testUserTokens = $this->refreshTokenRepository->findBy(['user' => $this->testUser]);
        $otherUserTokens = $this->refreshTokenRepository->findBy(['user' => $otherUser]);

        $this->assertCount(1, $testUserTokens);
        $this->assertCount(1, $otherUserTokens);

        $this->assertEquals($token1->getId(), $testUserTokens[0]->getId());
        $this->assertEquals($otherToken->getId(), $otherUserTokens[0]->getId());
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private function createTestToken(): RefreshToken
    {
        $plainToken = RefreshToken::generateToken();
        $tokenHash = RefreshToken::hashToken($plainToken);
        $expiresAt = new \DateTimeImmutable('+30 days');

        $refreshToken = new RefreshToken($this->testUser, $tokenHash, $expiresAt);
        $this->refreshTokenRepository->save($refreshToken);

        return $refreshToken;
    }
}
