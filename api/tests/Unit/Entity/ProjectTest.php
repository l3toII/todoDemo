<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Project;
use App\Entity\Task;
use App\Entity\User;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

class ProjectTest extends TestCase
{
    private function createUser(): User
    {
        $user = new User();
        $user->setEmail('test@example.com');
        return $user;
    }

    private function createTask(User $user, string $status = Task::STATUS_NEXT_ACTION): Task
    {
        $task = new Task();
        $task->setUser($user);
        $task->setTitle('Test Task');
        $task->setStatus($status);
        return $task;
    }

    // =========================================================================
    // Creation Tests
    // =========================================================================

    public function testProjectCreation(): void
    {
        $project = new Project();

        $this->assertInstanceOf(Uuid::class, $project->getId());
        $this->assertInstanceOf(\DateTimeImmutable::class, $project->getCreatedAt());
        $this->assertInstanceOf(\DateTimeImmutable::class, $project->getUpdatedAt());
        $this->assertEquals(Project::STATUS_ACTIVE, $project->getStatus());
        $this->assertEquals(0, $project->getPosition());
        $this->assertEquals(1, $project->getVersion());
        $this->assertNull($project->getOutcome());
        $this->assertNull($project->getReviewDate());
        $this->assertNull($project->getCompletedAt());
    }

    // =========================================================================
    // Title Tests
    // =========================================================================

    public function testTitleGetterSetter(): void
    {
        $project = new Project();
        $title = 'My Project';

        $project->setTitle($title);

        $this->assertEquals($title, $project->getTitle());
    }

    public function testTitleWithDifferentValues(): void
    {
        $project = new Project();

        $titles = ['Build website', 'Learn Spanish', 'Home renovation', 'Career planning'];
        foreach ($titles as $title) {
            $project->setTitle($title);
            $this->assertEquals($title, $project->getTitle());
        }
    }

    // =========================================================================
    // User Tests
    // =========================================================================

    public function testUserGetterSetter(): void
    {
        $project = new Project();
        $user = $this->createUser();

        $project->setUser($user);

        $this->assertSame($user, $project->getUser());
    }

    // =========================================================================
    // Outcome Tests
    // =========================================================================

    public function testOutcomeGetterSetter(): void
    {
        $project = new Project();
        $outcome = 'Successfully launch the new product with 1000 users in the first month';

        $project->setOutcome($outcome);

        $this->assertEquals($outcome, $project->getOutcome());
    }

    public function testOutcomeCanBeNull(): void
    {
        $project = new Project();

        $this->assertNull($project->getOutcome());

        $project->setOutcome('Some outcome');
        $project->setOutcome(null);
        $this->assertNull($project->getOutcome());
    }

    // =========================================================================
    // Status Tests
    // =========================================================================

    public function testStatusGetterSetter(): void
    {
        $project = new Project();

        foreach (Project::STATUSES as $status) {
            $project->setStatus($status);
            $this->assertEquals($status, $project->getStatus());
        }
    }

    public function testStatusConstants(): void
    {
        $this->assertEquals('active', Project::STATUS_ACTIVE);
        $this->assertEquals('on_hold', Project::STATUS_ON_HOLD);
        $this->assertEquals('completed', Project::STATUS_COMPLETED);
        $this->assertEquals('cancelled', Project::STATUS_CANCELLED);
    }

    public function testStatusesArray(): void
    {
        $this->assertCount(4, Project::STATUSES);
        $this->assertContains(Project::STATUS_ACTIVE, Project::STATUSES);
        $this->assertContains(Project::STATUS_ON_HOLD, Project::STATUSES);
        $this->assertContains(Project::STATUS_COMPLETED, Project::STATUSES);
        $this->assertContains(Project::STATUS_CANCELLED, Project::STATUSES);
    }

    public function testIsActive(): void
    {
        $project = new Project();

        $this->assertTrue($project->isActive());

        $project->setStatus(Project::STATUS_ON_HOLD);
        $this->assertFalse($project->isActive());

        $project->setStatus(Project::STATUS_ACTIVE);
        $this->assertTrue($project->isActive());
    }

    public function testIsOnHold(): void
    {
        $project = new Project();

        $this->assertFalse($project->isOnHold());

        $project->setStatus(Project::STATUS_ON_HOLD);
        $this->assertTrue($project->isOnHold());

        $project->setStatus(Project::STATUS_ACTIVE);
        $this->assertFalse($project->isOnHold());
    }

    public function testIsCompleted(): void
    {
        $project = new Project();

        $this->assertFalse($project->isCompleted());

        $project->setStatus(Project::STATUS_COMPLETED);
        $this->assertTrue($project->isCompleted());

        $project->setStatus(Project::STATUS_ACTIVE);
        $this->assertFalse($project->isCompleted());
    }

    public function testIsCancelled(): void
    {
        $project = new Project();

        $this->assertFalse($project->isCancelled());

        $project->setStatus(Project::STATUS_CANCELLED);
        $this->assertTrue($project->isCancelled());

        $project->setStatus(Project::STATUS_ACTIVE);
        $this->assertFalse($project->isCancelled());
    }

    // =========================================================================
    // Status Transition Methods
    // =========================================================================

    public function testComplete(): void
    {
        $project = new Project();

        $this->assertNull($project->getCompletedAt());

        $project->complete();

        $this->assertEquals(Project::STATUS_COMPLETED, $project->getStatus());
        $this->assertInstanceOf(\DateTimeImmutable::class, $project->getCompletedAt());
    }

    public function testCompleteDoesNotOverwriteExistingCompletedAt(): void
    {
        $project = new Project();
        $existingDate = new \DateTimeImmutable('2024-01-01');
        $project->setCompletedAt($existingDate);

        $project->complete();

        $this->assertEquals($existingDate, $project->getCompletedAt());
    }

    public function testPutOnHold(): void
    {
        $project = new Project();

        $project->putOnHold();

        $this->assertEquals(Project::STATUS_ON_HOLD, $project->getStatus());
        $this->assertTrue($project->isOnHold());
    }

    public function testActivate(): void
    {
        $project = new Project();
        $project->setStatus(Project::STATUS_ON_HOLD);

        $project->activate();

        $this->assertEquals(Project::STATUS_ACTIVE, $project->getStatus());
        $this->assertTrue($project->isActive());
    }

    public function testCancel(): void
    {
        $project = new Project();

        $project->cancel();

        $this->assertEquals(Project::STATUS_CANCELLED, $project->getStatus());
        $this->assertTrue($project->isCancelled());
    }

    // =========================================================================
    // Position Tests
    // =========================================================================

    public function testPositionGetterSetter(): void
    {
        $project = new Project();

        $project->setPosition(5);
        $this->assertEquals(5, $project->getPosition());

        $project->setPosition(0);
        $this->assertEquals(0, $project->getPosition());

        $project->setPosition(100);
        $this->assertEquals(100, $project->getPosition());
    }

    // =========================================================================
    // Review Date Tests
    // =========================================================================

    public function testReviewDateGetterSetter(): void
    {
        $project = new Project();
        $reviewDate = new \DateTimeImmutable('2025-01-15');

        $project->setReviewDate($reviewDate);

        $this->assertEquals($reviewDate, $project->getReviewDate());
    }

    public function testReviewDateCanBeNull(): void
    {
        $project = new Project();

        $this->assertNull($project->getReviewDate());

        $project->setReviewDate(new \DateTimeImmutable());
        $project->setReviewDate(null);
        $this->assertNull($project->getReviewDate());
    }

    // =========================================================================
    // CompletedAt Tests
    // =========================================================================

    public function testCompletedAtGetterSetter(): void
    {
        $project = new Project();
        $completedAt = new \DateTimeImmutable('2025-01-15 10:30:00');

        $project->setCompletedAt($completedAt);

        $this->assertEquals($completedAt, $project->getCompletedAt());
    }

    public function testCompletedAtCanBeNull(): void
    {
        $project = new Project();

        $this->assertNull($project->getCompletedAt());

        $project->setCompletedAt(new \DateTimeImmutable());
        $project->setCompletedAt(null);
        $this->assertNull($project->getCompletedAt());
    }

    // =========================================================================
    // Version Tests
    // =========================================================================

    public function testVersionDefaultValue(): void
    {
        $project = new Project();

        $this->assertEquals(1, $project->getVersion());
    }

    // =========================================================================
    // Lifecycle Callback Tests
    // =========================================================================

    public function testOnPreUpdate(): void
    {
        $project = new Project();
        $originalUpdatedAt = $project->getUpdatedAt();

        usleep(1000);

        $project->onPreUpdate();

        $this->assertNotEquals($originalUpdatedAt, $project->getUpdatedAt());
        $this->assertGreaterThan($originalUpdatedAt, $project->getUpdatedAt());
    }

    // =========================================================================
    // toArray Tests
    // =========================================================================

    public function testToArray(): void
    {
        $project = new Project();
        $user = $this->createUser();
        $project->setUser($user);
        $project->setTitle('Build Website');
        $project->setOutcome('Launch a professional website with 10 pages');
        $project->setStatus(Project::STATUS_ACTIVE);
        $project->setPosition(1);
        $project->setReviewDate(new \DateTimeImmutable('2025-02-01'));

        $array = $project->toArray();

        $this->assertIsArray($array);
        $this->assertArrayHasKey('id', $array);
        $this->assertArrayHasKey('title', $array);
        $this->assertArrayHasKey('outcome', $array);
        $this->assertArrayHasKey('status', $array);
        $this->assertArrayHasKey('position', $array);
        $this->assertArrayHasKey('review_date', $array);
        $this->assertArrayHasKey('version', $array);
        $this->assertArrayHasKey('created_at', $array);
        $this->assertArrayHasKey('updated_at', $array);
        $this->assertArrayHasKey('completed_at', $array);

        $this->assertEquals('Build Website', $array['title']);
        $this->assertEquals('Launch a professional website with 10 pages', $array['outcome']);
        $this->assertEquals(Project::STATUS_ACTIVE, $array['status']);
        $this->assertEquals(1, $array['position']);
        $this->assertEquals('2025-02-01', $array['review_date']);
        $this->assertEquals(1, $array['version']);
        $this->assertNull($array['completed_at']);
    }

    public function testToArrayWithMinimalData(): void
    {
        $project = new Project();
        $user = $this->createUser();
        $project->setUser($user);
        $project->setTitle('Simple Project');

        $array = $project->toArray();

        $this->assertEquals('Simple Project', $array['title']);
        $this->assertNull($array['outcome']);
        $this->assertEquals(Project::STATUS_ACTIVE, $array['status']);
        $this->assertEquals(0, $array['position']);
        $this->assertNull($array['review_date']);
        $this->assertNull($array['completed_at']);
    }

    public function testToArrayWithCompletedProject(): void
    {
        $project = new Project();
        $user = $this->createUser();
        $project->setUser($user);
        $project->setTitle('Completed Project');
        $project->complete();

        $array = $project->toArray();

        $this->assertEquals(Project::STATUS_COMPLETED, $array['status']);
        $this->assertNotNull($array['completed_at']);
    }

    // =========================================================================
    // Fluent Interface Tests
    // =========================================================================

    public function testFluentInterface(): void
    {
        $project = new Project();
        $user = $this->createUser();

        $result = $project
            ->setTitle('Test Project')
            ->setUser($user)
            ->setOutcome('Test outcome')
            ->setStatus(Project::STATUS_ACTIVE)
            ->setPosition(1)
            ->setReviewDate(new \DateTimeImmutable())
            ->setCompletedAt(null);

        $this->assertSame($project, $result);
    }

    public function testStatusTransitionMethodsFluentInterface(): void
    {
        $project = new Project();

        $result = $project->putOnHold();
        $this->assertSame($project, $result);

        $result = $project->activate();
        $this->assertSame($project, $result);

        $result = $project->complete();
        $this->assertSame($project, $result);

        $project2 = new Project();
        $result = $project2->cancel();
        $this->assertSame($project2, $result);
    }
}
