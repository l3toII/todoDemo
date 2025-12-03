<?php

namespace App\Tests\Unit\Repository;

use App\Entity\Project;
use App\Entity\Task;
use App\Entity\User;
use App\Repository\ProjectRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class ProjectRepositoryTest extends KernelTestCase
{
    private EntityManagerInterface $entityManager;
    private ProjectRepository $projectRepository;

    protected function setUp(): void
    {
        $kernel = self::bootKernel();
        $this->entityManager = $kernel->getContainer()
            ->get('doctrine')
            ->getManager();

        $this->projectRepository = $this->entityManager->getRepository(Project::class);

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
        $connection->executeStatement('DELETE FROM tasks');
        $connection->executeStatement('DELETE FROM projects');
        $connection->executeStatement('DELETE FROM refresh_tokens');
        $connection->executeStatement('DELETE FROM users');
    }

    // =========================================================================
    // CRUD Tests
    // =========================================================================

    public function testSave(): void
    {
        $user = $this->createTestUser('save@example.com');
        $project = new Project();
        $project->setTitle('Test Project');
        $project->setUser($user);

        $this->projectRepository->save($project);

        $this->assertNotNull($project->getId());

        $found = $this->projectRepository->findById($project->getId());
        $this->assertNotNull($found);
        $this->assertEquals('Test Project', $found->getTitle());
    }

    public function testSaveWithoutFlush(): void
    {
        $user = $this->createTestUser('noflush@example.com');
        $project = new Project();
        $project->setTitle('No Flush Project');
        $project->setUser($user);

        $this->projectRepository->save($project, flush: false);
        $this->entityManager->flush();

        $found = $this->projectRepository->findById($project->getId());
        $this->assertNotNull($found);
    }

    public function testRemove(): void
    {
        $user = $this->createTestUser('remove@example.com');
        $project = $this->createTestProject('Remove Project', $user);

        $projectId = $project->getId();
        $this->projectRepository->remove($project);

        $found = $this->projectRepository->findById($projectId);
        $this->assertNull($found);
    }

    public function testRemoveWithoutFlush(): void
    {
        $user = $this->createTestUser('removenoflush@example.com');
        $project = $this->createTestProject('Remove No Flush', $user);

        $projectId = $project->getId();
        $this->projectRepository->remove($project, flush: false);

        // Should still exist before flush
        $found = $this->projectRepository->findById($projectId);
        $this->assertNotNull($found);

        $this->entityManager->flush();

        // Should be gone after flush
        $found = $this->projectRepository->findById($projectId);
        $this->assertNull($found);
    }

    public function testFindById(): void
    {
        $user = $this->createTestUser('findbyid@example.com');
        $project = $this->createTestProject('Find By Id', $user);

        $found = $this->projectRepository->findById($project->getId());

        $this->assertNotNull($found);
        $this->assertEquals($project->getId(), $found->getId());
        $this->assertEquals('Find By Id', $found->getTitle());
    }

    public function testFindByIdNotFound(): void
    {
        $found = $this->projectRepository->findById(\Symfony\Component\Uid\Uuid::v4());

        $this->assertNull($found);
    }

    // =========================================================================
    // Find All By User Tests
    // =========================================================================

    public function testFindAllByUser(): void
    {
        $user = $this->createTestUser('allfor@example.com');
        $this->createTestProject('Project 1', $user, 0);
        $this->createTestProject('Project 2', $user, 1);

        $projects = $this->projectRepository->findAllByUser($user);

        $this->assertCount(2, $projects);
        $titles = array_map(fn($p) => $p->getTitle(), $projects);
        $this->assertContains('Project 1', $titles);
        $this->assertContains('Project 2', $titles);
    }

    public function testFindAllByUserExcludesOtherUsers(): void
    {
        $user1 = $this->createTestUser('user1@example.com');
        $user2 = $this->createTestUser('user2@example.com');

        $this->createTestProject('User1 Project', $user1);
        $this->createTestProject('User2 Project', $user2);

        $user1Projects = $this->projectRepository->findAllByUser($user1);
        $user2Projects = $this->projectRepository->findAllByUser($user2);

        $user1Titles = array_map(fn($p) => $p->getTitle(), $user1Projects);
        $user2Titles = array_map(fn($p) => $p->getTitle(), $user2Projects);

        $this->assertContains('User1 Project', $user1Titles);
        $this->assertNotContains('User2 Project', $user1Titles);

        $this->assertContains('User2 Project', $user2Titles);
        $this->assertNotContains('User1 Project', $user2Titles);
    }

    public function testFindAllByUserOrdersByPosition(): void
    {
        $user = $this->createTestUser('ordered@example.com');
        $this->createTestProject('Third', $user, 2);
        $this->createTestProject('First', $user, 0);
        $this->createTestProject('Second', $user, 1);

        $projects = $this->projectRepository->findAllByUser($user);

        $this->assertEquals('First', $projects[0]->getTitle());
        $this->assertEquals('Second', $projects[1]->getTitle());
        $this->assertEquals('Third', $projects[2]->getTitle());
    }

    // =========================================================================
    // Find Active By User Tests
    // =========================================================================

    public function testFindActiveByUser(): void
    {
        $user = $this->createTestUser('active@example.com');
        $this->createTestProject('Active 1', $user);
        $this->createTestProject('Active 2', $user);
        $completed = $this->createTestProject('Completed', $user);
        $completed->complete();
        $this->projectRepository->save($completed);

        $activeProjects = $this->projectRepository->findActiveByUser($user);

        $this->assertCount(2, $activeProjects);
        $titles = array_map(fn($p) => $p->getTitle(), $activeProjects);
        $this->assertContains('Active 1', $titles);
        $this->assertContains('Active 2', $titles);
        $this->assertNotContains('Completed', $titles);
    }

    public function testFindActiveByUserExcludesAllNonActiveStatuses(): void
    {
        $user = $this->createTestUser('nonactive@example.com');
        $this->createTestProject('Active', $user);

        $onHold = $this->createTestProject('On Hold', $user);
        $onHold->putOnHold();
        $this->projectRepository->save($onHold);

        $completed = $this->createTestProject('Completed', $user);
        $completed->complete();
        $this->projectRepository->save($completed);

        $cancelled = $this->createTestProject('Cancelled', $user);
        $cancelled->cancel();
        $this->projectRepository->save($cancelled);

        $activeProjects = $this->projectRepository->findActiveByUser($user);

        $this->assertCount(1, $activeProjects);
        $this->assertEquals('Active', $activeProjects[0]->getTitle());
    }

    // =========================================================================
    // Find By Status Tests
    // =========================================================================

    public function testFindByStatus(): void
    {
        $user = $this->createTestUser('bystatus@example.com');
        $this->createTestProject('Active 1', $user);
        $this->createTestProject('Active 2', $user);

        $onHold = $this->createTestProject('On Hold', $user);
        $onHold->putOnHold();
        $this->projectRepository->save($onHold);

        $activeProjects = $this->projectRepository->findByStatus($user, Project::STATUS_ACTIVE);
        $onHoldProjects = $this->projectRepository->findByStatus($user, Project::STATUS_ON_HOLD);

        $this->assertCount(2, $activeProjects);
        $this->assertCount(1, $onHoldProjects);
        $this->assertEquals('On Hold', $onHoldProjects[0]->getTitle());
    }

    public function testFindByStatusReturnsEmptyForNoMatches(): void
    {
        $user = $this->createTestUser('nostatus@example.com');
        $this->createTestProject('Active', $user);

        $completedProjects = $this->projectRepository->findByStatus($user, Project::STATUS_COMPLETED);

        $this->assertCount(0, $completedProjects);
    }

    // =========================================================================
    // Count By User Tests
    // =========================================================================

    public function testCountByUser(): void
    {
        $user = $this->createTestUser('countuser@example.com');
        $this->createTestProject('Project 1', $user);
        $this->createTestProject('Project 2', $user);
        $this->createTestProject('Project 3', $user);

        $count = $this->projectRepository->countByUser($user);

        $this->assertEquals(3, $count);
    }

    public function testCountByUserZero(): void
    {
        $user = $this->createTestUser('countzero@example.com');

        $count = $this->projectRepository->countByUser($user);

        $this->assertEquals(0, $count);
    }

    // =========================================================================
    // Count Active By User Tests
    // =========================================================================

    public function testCountActiveByUser(): void
    {
        $user = $this->createTestUser('countactive@example.com');
        $this->createTestProject('Active 1', $user);
        $this->createTestProject('Active 2', $user);

        $completed = $this->createTestProject('Completed', $user);
        $completed->complete();
        $this->projectRepository->save($completed);

        $count = $this->projectRepository->countActiveByUser($user);

        $this->assertEquals(2, $count);
    }

    public function testCountActiveByUserZero(): void
    {
        $user = $this->createTestUser('countactivezero@example.com');

        $completed = $this->createTestProject('Completed', $user);
        $completed->complete();
        $this->projectRepository->save($completed);

        $count = $this->projectRepository->countActiveByUser($user);

        $this->assertEquals(0, $count);
    }

    // =========================================================================
    // Get Max Position By User Tests
    // =========================================================================

    public function testGetMaxPositionByUser(): void
    {
        $user = $this->createTestUser('maxpos@example.com');
        $this->createTestProject('Pos 0', $user, 0);
        $this->createTestProject('Pos 5', $user, 5);
        $this->createTestProject('Pos 3', $user, 3);

        $maxPosition = $this->projectRepository->getMaxPositionByUser($user);

        $this->assertEquals(5, $maxPosition);
    }

    public function testGetMaxPositionByUserReturnsZeroWhenNoProjects(): void
    {
        $user = $this->createTestUser('maxposzero@example.com');

        $maxPosition = $this->projectRepository->getMaxPositionByUser($user);

        $this->assertEquals(0, $maxPosition);
    }

    // =========================================================================
    // Find Without Next Action Tests (FR-018)
    // =========================================================================

    public function testFindWithoutNextAction(): void
    {
        $user = $this->createTestUser('nonextaction@example.com');

        $projectWithNextAction = $this->createTestProject('Has Next Action', $user);
        $projectWithoutNextAction = $this->createTestProject('No Next Action', $user);

        // Create a next_action task for projectWithNextAction
        $task = new Task();
        $task->setUser($user);
        $task->setTitle('Next Action Task');
        $task->setStatus(Task::STATUS_NEXT_ACTION);
        $task->setProject($projectWithNextAction);
        $this->entityManager->persist($task);
        $this->entityManager->flush();

        $projectsWithoutNextAction = $this->projectRepository->findWithoutNextAction($user);

        $this->assertCount(1, $projectsWithoutNextAction);
        $this->assertEquals('No Next Action', $projectsWithoutNextAction[0]->getTitle());
    }

    public function testFindWithoutNextActionExcludesNonActiveProjects(): void
    {
        $user = $this->createTestUser('nonextactiveonly@example.com');

        $activeProject = $this->createTestProject('Active No NA', $user);
        $completedProject = $this->createTestProject('Completed No NA', $user);
        $completedProject->complete();
        $this->projectRepository->save($completedProject);

        $projectsWithoutNextAction = $this->projectRepository->findWithoutNextAction($user);

        $titles = array_map(fn($p) => $p->getTitle(), $projectsWithoutNextAction);
        $this->assertContains('Active No NA', $titles);
        $this->assertNotContains('Completed No NA', $titles);
    }

    public function testFindWithoutNextActionIgnoresOtherTaskStatuses(): void
    {
        $user = $this->createTestUser('otherstatus@example.com');

        $project = $this->createTestProject('Project', $user);

        // Create a waiting_for task (not next_action)
        $task = new Task();
        $task->setUser($user);
        $task->setTitle('Waiting Task');
        $task->setStatus(Task::STATUS_WAITING_FOR);
        $task->setProject($project);
        $this->entityManager->persist($task);
        $this->entityManager->flush();

        $projectsWithoutNextAction = $this->projectRepository->findWithoutNextAction($user);

        $this->assertCount(1, $projectsWithoutNextAction);
        $this->assertEquals('Project', $projectsWithoutNextAction[0]->getTitle());
    }

    // =========================================================================
    // Find Due For Review Tests
    // =========================================================================

    public function testFindDueForReview(): void
    {
        $user = $this->createTestUser('duereview@example.com');

        $dueProject = $this->createTestProject('Due Review', $user);
        $dueProject->setReviewDate(new \DateTimeImmutable('yesterday'));
        $this->projectRepository->save($dueProject);

        $futureProject = $this->createTestProject('Future Review', $user);
        $futureProject->setReviewDate(new \DateTimeImmutable('+7 days'));
        $this->projectRepository->save($futureProject);

        $noReviewProject = $this->createTestProject('No Review Date', $user);

        $dueForReview = $this->projectRepository->findDueForReview($user);

        $this->assertCount(1, $dueForReview);
        $this->assertEquals('Due Review', $dueForReview[0]->getTitle());
    }

    public function testFindDueForReviewIncludesToday(): void
    {
        $user = $this->createTestUser('duereviewtoday@example.com');

        $todayProject = $this->createTestProject('Due Today', $user);
        $todayProject->setReviewDate(new \DateTimeImmutable('today'));
        $this->projectRepository->save($todayProject);

        $dueForReview = $this->projectRepository->findDueForReview($user);

        $this->assertCount(1, $dueForReview);
        $this->assertEquals('Due Today', $dueForReview[0]->getTitle());
    }

    public function testFindDueForReviewExcludesNonActiveProjects(): void
    {
        $user = $this->createTestUser('duereviewactive@example.com');

        $activeProject = $this->createTestProject('Active Due', $user);
        $activeProject->setReviewDate(new \DateTimeImmutable('yesterday'));
        $this->projectRepository->save($activeProject);

        $completedProject = $this->createTestProject('Completed Due', $user);
        $completedProject->setReviewDate(new \DateTimeImmutable('yesterday'));
        $completedProject->complete();
        $this->projectRepository->save($completedProject);

        $dueForReview = $this->projectRepository->findDueForReview($user);

        $this->assertCount(1, $dueForReview);
        $this->assertEquals('Active Due', $dueForReview[0]->getTitle());
    }

    public function testFindDueForReviewOrdersByReviewDate(): void
    {
        $user = $this->createTestUser('duerevieworder@example.com');

        $laterProject = $this->createTestProject('Later', $user);
        $laterProject->setReviewDate(new \DateTimeImmutable('-1 day'));
        $this->projectRepository->save($laterProject);

        $earlierProject = $this->createTestProject('Earlier', $user);
        $earlierProject->setReviewDate(new \DateTimeImmutable('-3 days'));
        $this->projectRepository->save($earlierProject);

        $dueForReview = $this->projectRepository->findDueForReview($user);

        $this->assertCount(2, $dueForReview);
        $this->assertEquals('Earlier', $dueForReview[0]->getTitle());
        $this->assertEquals('Later', $dueForReview[1]->getTitle());
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

    private function createTestProject(string $title, User $user, int $position = 0): Project
    {
        $project = new Project();
        $project->setTitle($title);
        $project->setUser($user);
        $project->setPosition($position);
        $this->projectRepository->save($project);

        return $project;
    }
}
