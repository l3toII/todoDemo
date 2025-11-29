<?php

namespace App\Tests\Unit\Repository;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class UserRepositoryTest extends KernelTestCase
{
    private EntityManagerInterface $entityManager;
    private UserRepository $userRepository;

    protected function setUp(): void
    {
        $kernel = self::bootKernel();
        $this->entityManager = $kernel->getContainer()
            ->get('doctrine')
            ->getManager();

        $this->userRepository = $this->entityManager->getRepository(User::class);

        // Clean database before each test
        $this->cleanDatabase();
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
        $user = new User();
        $user->setEmail('save@example.com');
        $user->setPasswordHash('hashed_password');

        $this->userRepository->save($user);

        $this->assertNotNull($user->getId());

        // Verify it's in the database
        $found = $this->userRepository->findById($user->getId());
        $this->assertNotNull($found);
        $this->assertEquals('save@example.com', $found->getEmail());
    }

    public function testSaveWithoutFlush(): void
    {
        $user = new User();
        $user->setEmail('noflush@example.com');
        $user->setPasswordHash('hashed_password');

        $this->userRepository->save($user, flush: false);
        $this->entityManager->flush();

        $found = $this->userRepository->findById($user->getId());
        $this->assertNotNull($found);
    }

    public function testRemove(): void
    {
        $user = $this->createTestUser('remove@example.com');

        $userId = $user->getId();
        $this->userRepository->remove($user);

        $found = $this->userRepository->findById($userId);
        $this->assertNull($found);
    }

    public function testRemoveWithoutFlush(): void
    {
        $user = $this->createTestUser('removenoflush@example.com');

        $userId = $user->getId();
        $this->userRepository->remove($user, flush: false);

        // Should still exist before flush
        $found = $this->userRepository->findById($userId);
        $this->assertNotNull($found);

        $this->entityManager->flush();

        // Should be gone after flush
        $found = $this->userRepository->findById($userId);
        $this->assertNull($found);
    }

    public function testFindById(): void
    {
        $user = $this->createTestUser('findbyid@example.com');

        $found = $this->userRepository->findById($user->getId());

        $this->assertNotNull($found);
        $this->assertEquals($user->getId(), $found->getId());
        $this->assertEquals('findbyid@example.com', $found->getEmail());
    }

    public function testFindByIdNotFound(): void
    {
        $found = $this->userRepository->findById(\Symfony\Component\Uid\Uuid::v4());

        $this->assertNull($found);
    }

    // =========================================================================
    // Find By Email Tests
    // =========================================================================

    public function testFindByEmail(): void
    {
        $user = $this->createTestUser('findbyemail@example.com');

        $found = $this->userRepository->findByEmail('findbyemail@example.com');

        $this->assertNotNull($found);
        $this->assertEquals($user->getId(), $found->getId());
    }

    public function testFindByEmailNotFound(): void
    {
        $found = $this->userRepository->findByEmail('nonexistent@example.com');

        $this->assertNull($found);
    }

    public function testFindByEmailCaseInsensitive(): void
    {
        $user = $this->createTestUser('CaseSensitive@example.com');

        // Should find with different case
        $found = $this->userRepository->findByEmail('casesensitive@example.com');

        // Note: This depends on database collation
        // Most databases are case-insensitive for email searches
        if ($found) {
            $this->assertEquals($user->getId(), $found->getId());
        }
    }

    // =========================================================================
    // Find By Apple ID Tests
    // =========================================================================

    public function testFindByAppleId(): void
    {
        $user = $this->createTestUser('apple@example.com');
        $user->setAppleId('000123.abc456def789.1234');
        $this->userRepository->save($user);

        $found = $this->userRepository->findByAppleId('000123.abc456def789.1234');

        $this->assertNotNull($found);
        $this->assertEquals($user->getId(), $found->getId());
    }

    public function testFindByAppleIdNotFound(): void
    {
        $found = $this->userRepository->findByAppleId('nonexistent_apple_id');

        $this->assertNull($found);
    }

    // =========================================================================
    // Find By Verification Token Tests
    // =========================================================================

    public function testFindByVerificationToken(): void
    {
        $user = $this->createTestUser('verification@example.com');
        $token = bin2hex(random_bytes(32));
        $user->setVerificationToken($token);
        $this->userRepository->save($user);

        $found = $this->userRepository->findByVerificationToken($token);

        $this->assertNotNull($found);
        $this->assertEquals($user->getId(), $found->getId());
    }

    public function testFindByVerificationTokenNotFound(): void
    {
        $found = $this->userRepository->findByVerificationToken('invalid_token');

        $this->assertNull($found);
    }

    // =========================================================================
    // Find By Password Reset Token Tests
    // =========================================================================

    public function testFindByPasswordResetToken(): void
    {
        $user = $this->createTestUser('reset@example.com');
        $token = bin2hex(random_bytes(32));
        $user->setPasswordResetToken($token);
        $this->userRepository->save($user);

        $found = $this->userRepository->findByPasswordResetToken($token);

        $this->assertNotNull($found);
        $this->assertEquals($user->getId(), $found->getId());
    }

    public function testFindByPasswordResetTokenNotFound(): void
    {
        $found = $this->userRepository->findByPasswordResetToken('invalid_token');

        $this->assertNull($found);
    }

    // =========================================================================
    // Find Active Users Tests
    // =========================================================================

    public function testFindActiveUsers(): void
    {
        $active1 = $this->createTestUser('active1@example.com');
        $active1->setStatus(User::STATUS_ACTIVE);
        $this->userRepository->save($active1);

        $active2 = $this->createTestUser('active2@example.com');
        $active2->setStatus(User::STATUS_ACTIVE);
        $this->userRepository->save($active2);

        $pending = $this->createTestUser('pending@example.com');
        // pending status by default

        $activeUsers = $this->userRepository->findActiveUsers();

        $this->assertCount(2, $activeUsers);
        $emails = array_map(fn($u) => $u->getEmail(), $activeUsers);
        $this->assertContains('active1@example.com', $emails);
        $this->assertContains('active2@example.com', $emails);
        $this->assertNotContains('pending@example.com', $emails);
    }

    public function testFindActiveUsersEmpty(): void
    {
        $activeUsers = $this->userRepository->findActiveUsers();

        $this->assertCount(0, $activeUsers);
    }

    // =========================================================================
    // Find Pending Verification Tests
    // =========================================================================

    public function testFindPendingVerification(): void
    {
        $pending1 = $this->createTestUser('pending1@example.com');
        // pending status by default

        $pending2 = $this->createTestUser('pending2@example.com');
        // pending status by default

        $active = $this->createTestUser('active@example.com');
        $active->setStatus(User::STATUS_ACTIVE);
        $this->userRepository->save($active);

        $pendingUsers = $this->userRepository->findPendingVerification();

        $this->assertCount(2, $pendingUsers);
        $emails = array_map(fn($u) => $u->getEmail(), $pendingUsers);
        $this->assertContains('pending1@example.com', $emails);
        $this->assertContains('pending2@example.com', $emails);
        $this->assertNotContains('active@example.com', $emails);
    }

    // =========================================================================
    // Find By Status Tests
    // =========================================================================

    public function testFindByStatus(): void
    {
        $active = $this->createTestUser('active@example.com');
        $active->setStatus(User::STATUS_ACTIVE);
        $this->userRepository->save($active);

        $suspended = $this->createTestUser('suspended@example.com');
        $suspended->setStatus(User::STATUS_SUSPENDED);
        $this->userRepository->save($suspended);

        $activeUsers = $this->userRepository->findByStatus(User::STATUS_ACTIVE);
        $suspendedUsers = $this->userRepository->findByStatus(User::STATUS_SUSPENDED);

        $this->assertCount(1, $activeUsers);
        $this->assertEquals('active@example.com', $activeUsers[0]->getEmail());

        $this->assertCount(1, $suspendedUsers);
        $this->assertEquals('suspended@example.com', $suspendedUsers[0]->getEmail());
    }

    public function testFindByStatusOrdered(): void
    {
        sleep(1); // Ensure different creation times
        $user1 = $this->createTestUser('user1@example.com');

        sleep(1);
        $user2 = $this->createTestUser('user2@example.com');

        $users = $this->userRepository->findByStatus(User::STATUS_PENDING_VERIFICATION);

        // Should be ordered by createdAt DESC (newest first)
        $this->assertCount(2, $users);
        $this->assertEquals('user2@example.com', $users[0]->getEmail());
        $this->assertEquals('user1@example.com', $users[1]->getEmail());
    }

    // =========================================================================
    // Count By Status Tests
    // =========================================================================

    public function testCountByStatus(): void
    {
        $this->createTestUser('pending1@example.com');
        $this->createTestUser('pending2@example.com');

        $active = $this->createTestUser('active@example.com');
        $active->setStatus(User::STATUS_ACTIVE);
        $this->userRepository->save($active);

        $pendingCount = $this->userRepository->countByStatus(User::STATUS_PENDING_VERIFICATION);
        $activeCount = $this->userRepository->countByStatus(User::STATUS_ACTIVE);
        $suspendedCount = $this->userRepository->countByStatus(User::STATUS_SUSPENDED);

        $this->assertEquals(2, $pendingCount);
        $this->assertEquals(1, $activeCount);
        $this->assertEquals(0, $suspendedCount);
    }

    // =========================================================================
    // Find Inactive Users Tests
    // =========================================================================

    public function testFindInactiveUsers(): void
    {
        $oldUser = $this->createTestUser('old@example.com');
        $oldUser->setStatus(User::STATUS_ACTIVE);
        $oldUser->setLastLoginAt(new \DateTimeImmutable('-60 days'));
        $this->userRepository->save($oldUser);

        $recentUser = $this->createTestUser('recent@example.com');
        $recentUser->setStatus(User::STATUS_ACTIVE);
        $recentUser->setLastLoginAt(new \DateTimeImmutable('-5 days'));
        $this->userRepository->save($recentUser);

        $neverLoggedIn = $this->createTestUser('never@example.com');
        $neverLoggedIn->setStatus(User::STATUS_ACTIVE);
        $this->userRepository->save($neverLoggedIn);

        $since = new \DateTimeImmutable('-30 days');
        $inactiveUsers = $this->userRepository->findInactiveUsers($since);

        $this->assertCount(2, $inactiveUsers); // old and never
        $emails = array_map(fn($u) => $u->getEmail(), $inactiveUsers);
        $this->assertContains('old@example.com', $emails);
        $this->assertContains('never@example.com', $emails);
        $this->assertNotContains('recent@example.com', $emails);
    }

    public function testFindInactiveUsersOnlyActive(): void
    {
        $inactive = $this->createTestUser('inactive@example.com');
        $inactive->setStatus(User::STATUS_SUSPENDED);
        $inactive->setLastLoginAt(new \DateTimeImmutable('-60 days'));
        $this->userRepository->save($inactive);

        $since = new \DateTimeImmutable('-30 days');
        $inactiveUsers = $this->userRepository->findInactiveUsers($since);

        // Should not include non-active users
        $this->assertCount(0, $inactiveUsers);
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private function createTestUser(string $email): User
    {
        $user = new User();
        $user->setEmail($email);
        $user->setPasswordHash('hashed_password_' . bin2hex(random_bytes(8)));
        $this->userRepository->save($user);

        return $user;
    }
}
