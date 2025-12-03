<?php

namespace App\Tests\Unit\Repository;

use App\Entity\Context;
use App\Entity\User;
use App\Repository\ContextRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class ContextRepositoryTest extends KernelTestCase
{
    private EntityManagerInterface $entityManager;
    private ContextRepository $contextRepository;

    protected function setUp(): void
    {
        $kernel = self::bootKernel();
        $this->entityManager = $kernel->getContainer()
            ->get('doctrine')
            ->getManager();

        $this->contextRepository = $this->entityManager->getRepository(Context::class);

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
        $connection->executeStatement('DELETE FROM task_contexts');
        $connection->executeStatement('DELETE FROM contexts WHERE user_id IS NOT NULL');
        $connection->executeStatement('DELETE FROM tasks');
        $connection->executeStatement('DELETE FROM refresh_tokens');
        $connection->executeStatement('DELETE FROM users');
    }

    // =========================================================================
    // CRUD Tests
    // =========================================================================

    public function testSave(): void
    {
        $user = $this->createTestUser('save@example.com');
        $context = new Context();
        $context->setName('@TestContext');
        $context->setUser($user);

        $this->contextRepository->save($context);

        $this->assertNotNull($context->getId());

        $found = $this->contextRepository->findById($context->getId());
        $this->assertNotNull($found);
        $this->assertEquals('@TestContext', $found->getName());
    }

    public function testSaveWithoutFlush(): void
    {
        $user = $this->createTestUser('noflush@example.com');
        $context = new Context();
        $context->setName('@NoFlush');
        $context->setUser($user);

        $this->contextRepository->save($context, flush: false);
        $this->entityManager->flush();

        $found = $this->contextRepository->findById($context->getId());
        $this->assertNotNull($found);
    }

    public function testRemove(): void
    {
        $user = $this->createTestUser('remove@example.com');
        $context = $this->createTestContext('@Remove', $user);

        $contextId = $context->getId();
        $this->contextRepository->remove($context);

        $found = $this->contextRepository->findById($contextId);
        $this->assertNull($found);
    }

    public function testRemoveWithoutFlush(): void
    {
        $user = $this->createTestUser('removenoflush@example.com');
        $context = $this->createTestContext('@RemoveNoFlush', $user);

        $contextId = $context->getId();
        $this->contextRepository->remove($context, flush: false);

        // Should still exist before flush
        $found = $this->contextRepository->findById($contextId);
        $this->assertNotNull($found);

        $this->entityManager->flush();

        // Should be gone after flush
        $found = $this->contextRepository->findById($contextId);
        $this->assertNull($found);
    }

    public function testFindById(): void
    {
        $user = $this->createTestUser('findbyid@example.com');
        $context = $this->createTestContext('@FindById', $user);

        $found = $this->contextRepository->findById($context->getId());

        $this->assertNotNull($found);
        $this->assertEquals($context->getId(), $found->getId());
        $this->assertEquals('@FindById', $found->getName());
    }

    public function testFindByIdNotFound(): void
    {
        $found = $this->contextRepository->findById(\Symfony\Component\Uid\Uuid::v4());

        $this->assertNull($found);
    }

    // =========================================================================
    // Find All For User Tests
    // =========================================================================

    public function testFindAllForUser(): void
    {
        $user = $this->createTestUser('allfor@example.com');
        $context1 = $this->createTestContext('@Custom1', $user, 0);
        $context2 = $this->createTestContext('@Custom2', $user, 1);

        $contexts = $this->contextRepository->findAllForUser($user);

        // Should include user's contexts + system defaults
        $this->assertGreaterThanOrEqual(2, count($contexts));

        $names = array_map(fn($c) => $c->getName(), $contexts);
        $this->assertContains('@Custom1', $names);
        $this->assertContains('@Custom2', $names);
    }

    public function testFindAllForUserExcludesOtherUsers(): void
    {
        $user1 = $this->createTestUser('user1@example.com');
        $user2 = $this->createTestUser('user2@example.com');

        $context1 = $this->createTestContext('@User1Context', $user1);
        $context2 = $this->createTestContext('@User2Context', $user2);

        $user1Contexts = $this->contextRepository->findAllForUser($user1);
        $user2Contexts = $this->contextRepository->findAllForUser($user2);

        $user1Names = array_map(fn($c) => $c->getName(), $user1Contexts);
        $user2Names = array_map(fn($c) => $c->getName(), $user2Contexts);

        $this->assertContains('@User1Context', $user1Names);
        $this->assertNotContains('@User2Context', $user1Names);

        $this->assertContains('@User2Context', $user2Names);
        $this->assertNotContains('@User1Context', $user2Names);
    }

    public function testFindAllForUserExcludesArchived(): void
    {
        $user = $this->createTestUser('archived@example.com');
        $active = $this->createTestContext('@Active', $user);
        $archived = $this->createTestContext('@Archived', $user);
        $archived->setStatus(Context::STATUS_ARCHIVED);
        $this->contextRepository->save($archived);

        $contexts = $this->contextRepository->findAllForUser($user);

        $names = array_map(fn($c) => $c->getName(), $contexts);
        $this->assertContains('@Active', $names);
        $this->assertNotContains('@Archived', $names);
    }

    // =========================================================================
    // Find Defaults Tests
    // =========================================================================

    public function testFindDefaults(): void
    {
        $defaults = $this->contextRepository->findDefaults();

        // Should return seeded default contexts
        $this->assertGreaterThanOrEqual(6, count($defaults));

        $names = array_map(fn($c) => $c->getName(), $defaults);
        $this->assertContains('@Office', $names);
        $this->assertContains('@Home', $names);
        $this->assertContains('@Phone', $names);
        $this->assertContains('@Errands', $names);
        $this->assertContains('@Computer', $names);
        $this->assertContains('@Waiting', $names);
    }

    public function testFindDefaultsExcludesUserContexts(): void
    {
        $user = $this->createTestUser('excludeuser@example.com');
        $userContext = $this->createTestContext('@UserOnly', $user);

        $defaults = $this->contextRepository->findDefaults();

        $names = array_map(fn($c) => $c->getName(), $defaults);
        $this->assertNotContains('@UserOnly', $names);
    }

    // =========================================================================
    // Find Custom By User Tests
    // =========================================================================

    public function testFindCustomByUser(): void
    {
        $user = $this->createTestUser('custom@example.com');
        $custom1 = $this->createTestContext('@Custom1', $user, 0);
        $custom2 = $this->createTestContext('@Custom2', $user, 1);

        $customs = $this->contextRepository->findCustomByUser($user);

        $this->assertCount(2, $customs);
        $names = array_map(fn($c) => $c->getName(), $customs);
        $this->assertContains('@Custom1', $names);
        $this->assertContains('@Custom2', $names);
    }

    public function testFindCustomByUserExcludesDefaults(): void
    {
        $user = $this->createTestUser('customnodefault@example.com');
        $custom = $this->createTestContext('@CustomOnly', $user);

        $customs = $this->contextRepository->findCustomByUser($user);

        $names = array_map(fn($c) => $c->getName(), $customs);
        $this->assertContains('@CustomOnly', $names);
        $this->assertNotContains('@Office', $names);
    }

    public function testFindCustomByUserExcludesArchived(): void
    {
        $user = $this->createTestUser('customarchived@example.com');
        $active = $this->createTestContext('@Active', $user);
        $archived = $this->createTestContext('@Archived', $user);
        $archived->setStatus(Context::STATUS_ARCHIVED);
        $this->contextRepository->save($archived);

        $customs = $this->contextRepository->findCustomByUser($user);

        $names = array_map(fn($c) => $c->getName(), $customs);
        $this->assertContains('@Active', $names);
        $this->assertNotContains('@Archived', $names);
    }

    // =========================================================================
    // Find By Name For User Tests
    // =========================================================================

    public function testFindByNameForUser(): void
    {
        $user = $this->createTestUser('byname@example.com');
        $context = $this->createTestContext('@ByName', $user);

        $found = $this->contextRepository->findByNameForUser('@ByName', $user);

        $this->assertNotNull($found);
        $this->assertEquals($context->getId(), $found->getId());
    }

    public function testFindByNameForUserFindsDefaults(): void
    {
        $user = $this->createTestUser('bynamedefault@example.com');

        $found = $this->contextRepository->findByNameForUser('@Office', $user);

        $this->assertNotNull($found);
        $this->assertEquals('@Office', $found->getName());
        $this->assertTrue($found->isDefault());
    }

    public function testFindByNameForUserNotFound(): void
    {
        $user = $this->createTestUser('bynamenotfound@example.com');

        $found = $this->contextRepository->findByNameForUser('@NonExistent', $user);

        $this->assertNull($found);
    }

    public function testFindByNameForUserDoesNotFindOtherUsers(): void
    {
        $user1 = $this->createTestUser('byname1@example.com');
        $user2 = $this->createTestUser('byname2@example.com');

        $context = $this->createTestContext('@User1Only', $user1);

        $foundByUser1 = $this->contextRepository->findByNameForUser('@User1Only', $user1);
        $foundByUser2 = $this->contextRepository->findByNameForUser('@User1Only', $user2);

        $this->assertNotNull($foundByUser1);
        $this->assertNull($foundByUser2);
    }

    // =========================================================================
    // Is Name Available Tests
    // =========================================================================

    public function testIsNameAvailable(): void
    {
        $user = $this->createTestUser('available@example.com');

        $available = $this->contextRepository->isNameAvailable('@NewContext', $user);

        $this->assertTrue($available);
    }

    public function testIsNameAvailableReturnsFalseForExisting(): void
    {
        $user = $this->createTestUser('notavailable@example.com');
        $context = $this->createTestContext('@Existing', $user);

        $available = $this->contextRepository->isNameAvailable('@Existing', $user);

        $this->assertFalse($available);
    }

    public function testIsNameAvailableReturnsFalseForDefaults(): void
    {
        $user = $this->createTestUser('notavailabledefault@example.com');

        $available = $this->contextRepository->isNameAvailable('@Office', $user);

        $this->assertFalse($available);
    }

    public function testIsNameAvailableWithExcludeId(): void
    {
        $user = $this->createTestUser('excludeid@example.com');
        $context = $this->createTestContext('@Exclude', $user);

        // Without exclude - should be false (name exists)
        $availableWithout = $this->contextRepository->isNameAvailable('@Exclude', $user);
        $this->assertFalse($availableWithout);

        // With exclude - should be true (excluding the context that has the name)
        $availableWith = $this->contextRepository->isNameAvailable('@Exclude', $user, $context->getId());
        $this->assertTrue($availableWith);
    }

    // =========================================================================
    // Find Archived By User Tests
    // =========================================================================

    public function testFindArchivedByUser(): void
    {
        $user = $this->createTestUser('findarchiveduser@example.com');
        $active = $this->createTestContext('@Active', $user);
        $archived1 = $this->createTestContext('@Archived1', $user);
        $archived1->setStatus(Context::STATUS_ARCHIVED);
        $this->contextRepository->save($archived1);

        $archived2 = $this->createTestContext('@Archived2', $user);
        $archived2->setStatus(Context::STATUS_ARCHIVED);
        $this->contextRepository->save($archived2);

        $archivedContexts = $this->contextRepository->findArchivedByUser($user);

        $this->assertCount(2, $archivedContexts);
        $names = array_map(fn($c) => $c->getName(), $archivedContexts);
        $this->assertContains('@Archived1', $names);
        $this->assertContains('@Archived2', $names);
        $this->assertNotContains('@Active', $names);
    }

    public function testFindArchivedByUserEmpty(): void
    {
        $user = $this->createTestUser('noarchived@example.com');
        $active = $this->createTestContext('@Active', $user);

        $archivedContexts = $this->contextRepository->findArchivedByUser($user);

        $this->assertCount(0, $archivedContexts);
    }

    // =========================================================================
    // Count By User Tests
    // =========================================================================

    public function testCountByUser(): void
    {
        $user = $this->createTestUser('countuser@example.com');
        $this->createTestContext('@Count1', $user);
        $this->createTestContext('@Count2', $user);
        $this->createTestContext('@Count3', $user);

        $count = $this->contextRepository->countByUser($user);

        $this->assertEquals(3, $count);
    }

    public function testCountByUserExcludesArchived(): void
    {
        $user = $this->createTestUser('countarchived@example.com');
        $this->createTestContext('@Active1', $user);
        $this->createTestContext('@Active2', $user);
        $archived = $this->createTestContext('@Archived', $user);
        $archived->setStatus(Context::STATUS_ARCHIVED);
        $this->contextRepository->save($archived);

        $count = $this->contextRepository->countByUser($user);

        $this->assertEquals(2, $count);
    }

    public function testCountByUserZero(): void
    {
        $user = $this->createTestUser('countzero@example.com');

        $count = $this->contextRepository->countByUser($user);

        $this->assertEquals(0, $count);
    }

    // =========================================================================
    // Get Max Position By User Tests
    // =========================================================================

    public function testGetMaxPositionByUser(): void
    {
        $user = $this->createTestUser('maxpos@example.com');
        $this->createTestContext('@Pos0', $user, 0);
        $this->createTestContext('@Pos5', $user, 5);
        $this->createTestContext('@Pos3', $user, 3);

        $maxPosition = $this->contextRepository->getMaxPositionByUser($user);

        $this->assertEquals(5, $maxPosition);
    }

    public function testGetMaxPositionByUserReturnsZeroWhenNoContexts(): void
    {
        $user = $this->createTestUser('maxposzero@example.com');

        $maxPosition = $this->contextRepository->getMaxPositionByUser($user);

        $this->assertEquals(0, $maxPosition);
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private function createTestUser(string $email): User
    {
        $user = new User();
        $user->setEmail($email);
        $user->setPasswordHash('hashed_password_' . bin2hex(random_bytes(8)));
        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    private function createTestContext(string $name, User $user, int $position = 0): Context
    {
        $context = new Context();
        $context->setName($name);
        $context->setUser($user);
        $context->setPosition($position);
        $this->contextRepository->save($context);

        return $context;
    }
}
