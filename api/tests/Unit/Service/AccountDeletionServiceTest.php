<?php

namespace App\Tests\Unit\Service;

use App\Entity\RefreshToken;
use App\Entity\User;
use App\Repository\RefreshTokenRepository;
use App\Repository\UserRepository;
use App\Service\AccountDeletionService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class AccountDeletionServiceTest extends TestCase
{
    private EntityManagerInterface $entityManager;
    private UserRepository $userRepository;
    private RefreshTokenRepository $refreshTokenRepository;
    private LoggerInterface $logger;
    private AccountDeletionService $service;

    protected function setUp(): void
    {
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->userRepository = $this->createMock(UserRepository::class);
        $this->refreshTokenRepository = $this->createMock(RefreshTokenRepository::class);
        $this->logger = $this->createMock(LoggerInterface::class);

        $this->service = new AccountDeletionService(
            $this->entityManager,
            $this->userRepository,
            $this->refreshTokenRepository,
            $this->logger
        );
    }

    // =========================================================================
    // Delete Account Tests
    // =========================================================================

    public function testDeleteAccountStartsTransaction(): void
    {
        $user = $this->createTestUser();

        $this->entityManager->expects($this->once())
            ->method('beginTransaction');

        $this->entityManager->expects($this->once())
            ->method('flush');

        $this->entityManager->expects($this->once())
            ->method('commit');

        $this->refreshTokenRepository->expects($this->once())
            ->method('findBy')
            ->with(['user' => $user])
            ->willReturn([]);

        $this->userRepository->expects($this->once())
            ->method('remove')
            ->with($user, false);

        $this->service->deleteAccount($user);
    }

    public function testDeleteAccountLogsInfo(): void
    {
        $user = $this->createTestUser();

        $this->logger->expects($this->exactly(2))
            ->method('info')
            ->withConsecutive(
                [
                    'Starting account deletion',
                    $this->callback(function ($context) use ($user) {
                        return isset($context['user_id'])
                            && isset($context['email'])
                            && $context['email'] === 'test@example.com';
                    })
                ],
                [
                    'Account deletion completed successfully',
                    $this->callback(function ($context) use ($user) {
                        return isset($context['user_id'])
                            && isset($context['email']);
                    })
                ]
            );

        $this->refreshTokenRepository->method('findBy')->willReturn([]);

        $this->service->deleteAccount($user);
    }

    public function testDeleteAccountDeletesRefreshTokens(): void
    {
        $user = $this->createTestUser();

        $token1 = $this->createMock(RefreshToken::class);
        $token2 = $this->createMock(RefreshToken::class);

        $this->refreshTokenRepository->expects($this->once())
            ->method('findBy')
            ->with(['user' => $user])
            ->willReturn([$token1, $token2]);

        $this->entityManager->expects($this->exactly(2))
            ->method('remove')
            ->withConsecutive(
                [$token1],
                [$token2]
            );

        $this->logger->expects($this->once())
            ->method('debug')
            ->with('Deleted refresh tokens', $this->callback(function ($context) {
                return $context['count'] === 2;
            }));

        $this->service->deleteAccount($user);
    }

    public function testDeleteAccountDeletesUser(): void
    {
        $user = $this->createTestUser();

        $this->refreshTokenRepository->method('findBy')->willReturn([]);

        $this->userRepository->expects($this->once())
            ->method('remove')
            ->with($user, false);

        $this->service->deleteAccount($user);
    }

    public function testDeleteAccountCommitsTransaction(): void
    {
        $user = $this->createTestUser();

        $this->refreshTokenRepository->method('findBy')->willReturn([]);

        $this->entityManager->expects($this->once())
            ->method('commit');

        $this->service->deleteAccount($user);
    }

    public function testDeleteAccountRollsBackOnError(): void
    {
        $user = $this->createTestUser();

        $connection = $this->createMock(\Doctrine\DBAL\Connection::class);
        $connection->method('isTransactionActive')->willReturn(true);

        $this->entityManager->method('getConnection')->willReturn($connection);

        $this->refreshTokenRepository->method('findBy')->willReturn([]);

        $this->userRepository->method('remove')
            ->willThrowException(new \Exception('Database error'));

        $this->entityManager->expects($this->once())
            ->method('rollback');

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Failed to delete account');

        $this->service->deleteAccount($user);
    }

    public function testDeleteAccountLogsErrorOnFailure(): void
    {
        $user = $this->createTestUser();

        $connection = $this->createMock(\Doctrine\DBAL\Connection::class);
        $connection->method('isTransactionActive')->willReturn(true);

        $this->entityManager->method('getConnection')->willReturn($connection);

        $this->refreshTokenRepository->method('findBy')->willReturn([]);

        $exception = new \Exception('Database error');
        $this->userRepository->method('remove')->willThrowException($exception);

        $this->logger->expects($this->once())
            ->method('error')
            ->with('Account deletion failed', $this->callback(function ($context) {
                return isset($context['error']) && $context['error'] === 'Database error';
            }));

        try {
            $this->service->deleteAccount($user);
        } catch (\RuntimeException $e) {
            // Expected
        }
    }

    public function testDeleteAccountWrapsExceptionWithUserMessage(): void
    {
        $user = $this->createTestUser();

        $connection = $this->createMock(\Doctrine\DBAL\Connection::class);
        $connection->method('isTransactionActive')->willReturn(true);

        $this->entityManager->method('getConnection')->willReturn($connection);

        $this->refreshTokenRepository->method('findBy')->willReturn([]);

        $originalException = new \Exception('Database error');
        $this->userRepository->method('remove')->willThrowException($originalException);

        try {
            $this->service->deleteAccount($user);
            $this->fail('Expected RuntimeException to be thrown');
        } catch (\RuntimeException $e) {
            $this->assertEquals('Failed to delete account. Please try again or contact support.', $e->getMessage());
            $this->assertSame($originalException, $e->getPrevious());
        }
    }

    // =========================================================================
    // Can Delete Account Tests
    // =========================================================================

    public function testCanDeleteAccountReturnsTrue(): void
    {
        $user = $this->createTestUser();

        $result = $this->service->canDeleteAccount($user);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('allowed', $result);
        $this->assertTrue($result['allowed']);
    }

    public function testCanDeleteAccountStructure(): void
    {
        $user = $this->createTestUser();

        $result = $this->service->canDeleteAccount($user);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('allowed', $result);
        $this->assertIsBool($result['allowed']);
    }

    // =========================================================================
    // Soft Delete Tests
    // =========================================================================

    public function testSoftDeleteMarksAsDeleted(): void
    {
        $user = $this->createTestUser();

        $this->userRepository->expects($this->once())
            ->method('save')
            ->with($this->callback(function ($savedUser) {
                return $savedUser->getStatus() === User::STATUS_DELETED;
            }));

        $this->service->softDeleteAccount($user);

        $this->assertEquals(User::STATUS_DELETED, $user->getStatus());
    }

    public function testSoftDeleteRevokesTokens(): void
    {
        $user = $this->createTestUser();

        $this->refreshTokenRepository->expects($this->once())
            ->method('revokeAllForUser')
            ->with($user);

        $this->service->softDeleteAccount($user);
    }

    public function testSoftDeleteLogsInfo(): void
    {
        $user = $this->createTestUser();

        $this->logger->expects($this->once())
            ->method('info')
            ->with('Account soft deleted', $this->callback(function ($context) {
                return isset($context['user_id']) && isset($context['email']);
            }));

        $this->service->softDeleteAccount($user);
    }

    // =========================================================================
    // Integration-Style Tests
    // =========================================================================

    public function testDeleteAccountFlowOrder(): void
    {
        $user = $this->createTestUser();

        $callOrder = [];

        $this->entityManager->method('beginTransaction')
            ->willReturnCallback(function () use (&$callOrder) {
                $callOrder[] = 'beginTransaction';
            });

        $this->refreshTokenRepository->method('findBy')
            ->willReturnCallback(function () use (&$callOrder) {
                $callOrder[] = 'findRefreshTokens';
                return [];
            });

        $this->userRepository->method('remove')
            ->willReturnCallback(function () use (&$callOrder) {
                $callOrder[] = 'removeUser';
            });

        $this->entityManager->method('flush')
            ->willReturnCallback(function () use (&$callOrder) {
                $callOrder[] = 'flush';
            });

        $this->entityManager->method('commit')
            ->willReturnCallback(function () use (&$callOrder) {
                $callOrder[] = 'commit';
            });

        $this->service->deleteAccount($user);

        $this->assertEquals([
            'beginTransaction',
            'findRefreshTokens',
            'removeUser',
            'flush',
            'commit'
        ], $callOrder);
    }

    public function testDeleteAccountWithMultipleRefreshTokens(): void
    {
        $user = $this->createTestUser();

        $tokens = [
            $this->createMock(RefreshToken::class),
            $this->createMock(RefreshToken::class),
            $this->createMock(RefreshToken::class),
        ];

        $this->refreshTokenRepository->method('findBy')->willReturn($tokens);

        $removeCallCount = 0;
        $this->entityManager->method('remove')
            ->willReturnCallback(function () use (&$removeCallCount) {
                $removeCallCount++;
            });

        $this->service->deleteAccount($user);

        // Should remove 3 tokens
        $this->assertEquals(3, $removeCallCount);
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private function createTestUser(): User
    {
        $user = new User();
        $user->setEmail('test@example.com');
        $user->setPasswordHash('hashed_password');

        return $user;
    }
}
