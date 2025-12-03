<?php

declare(strict_types=1);

namespace App\Tests\Unit\Service;

use App\Entity\Project;
use App\Entity\Task;
use App\Entity\User;
use App\Repository\ProjectRepository;
use App\Repository\TaskRepository;
use App\Service\ProjectService;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

class ProjectServiceTest extends TestCase
{
    private ProjectService $projectService;
    private ProjectRepository&MockObject $projectRepository;
    private TaskRepository&MockObject $taskRepository;

    protected function setUp(): void
    {
        $this->projectRepository = $this->createMock(ProjectRepository::class);
        $this->taskRepository = $this->createMock(TaskRepository::class);
        $this->projectService = new ProjectService($this->projectRepository, $this->taskRepository);
    }

    private function createUser(): User
    {
        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn(Uuid::v4());

        return $user;
    }

    private function createProject(string $status = Project::STATUS_ACTIVE): Project
    {
        $user = $this->createUser();
        $project = new Project();
        $project->setTitle('Test Project');
        $project->setUser($user);

        // Use reflection to set status directly
        if ($status !== Project::STATUS_ACTIVE) {
            $reflection = new \ReflectionClass($project);
            $property = $reflection->getProperty('status');
            $property->setAccessible(true);
            $property->setValue($project, $status);
        }

        return $project;
    }

    private function createTask(string $status = Task::STATUS_INBOX, int $position = 0): Task
    {
        $user = $this->createMock(User::class);
        $task = new Task();
        $task->setUser($user);
        $task->setTitle('Test Task');
        $task->setPosition($position);

        // Use reflection to set status directly
        $reflection = new \ReflectionClass($task);
        $property = $reflection->getProperty('status');
        $property->setAccessible(true);
        $property->setValue($task, $status);

        return $task;
    }

    // =========================================================================
    // Status Transition Validation Tests
    // =========================================================================

    public function testIsValidTransitionFromActive(): void
    {
        // Valid transitions from active
        $this->assertTrue($this->projectService->isValidTransition(Project::STATUS_ACTIVE, Project::STATUS_ON_HOLD));
        $this->assertTrue($this->projectService->isValidTransition(Project::STATUS_ACTIVE, Project::STATUS_COMPLETED));
        $this->assertTrue($this->projectService->isValidTransition(Project::STATUS_ACTIVE, Project::STATUS_CANCELLED));

        // Same status is always valid
        $this->assertTrue($this->projectService->isValidTransition(Project::STATUS_ACTIVE, Project::STATUS_ACTIVE));
    }

    public function testIsValidTransitionFromOnHold(): void
    {
        $this->assertTrue($this->projectService->isValidTransition(Project::STATUS_ON_HOLD, Project::STATUS_ACTIVE));
        $this->assertTrue($this->projectService->isValidTransition(Project::STATUS_ON_HOLD, Project::STATUS_CANCELLED));

        // Cannot complete directly from on_hold
        $this->assertFalse($this->projectService->isValidTransition(Project::STATUS_ON_HOLD, Project::STATUS_COMPLETED));
    }

    public function testIsValidTransitionFromCompleted(): void
    {
        // Can reopen a completed project
        $this->assertTrue($this->projectService->isValidTransition(Project::STATUS_COMPLETED, Project::STATUS_ACTIVE));

        // Cannot transition to other statuses
        $this->assertFalse($this->projectService->isValidTransition(Project::STATUS_COMPLETED, Project::STATUS_ON_HOLD));
        $this->assertFalse($this->projectService->isValidTransition(Project::STATUS_COMPLETED, Project::STATUS_CANCELLED));
    }

    public function testIsValidTransitionFromCancelled(): void
    {
        // Can reopen a cancelled project
        $this->assertTrue($this->projectService->isValidTransition(Project::STATUS_CANCELLED, Project::STATUS_ACTIVE));

        // Cannot transition to other statuses
        $this->assertFalse($this->projectService->isValidTransition(Project::STATUS_CANCELLED, Project::STATUS_ON_HOLD));
        $this->assertFalse($this->projectService->isValidTransition(Project::STATUS_CANCELLED, Project::STATUS_COMPLETED));
    }

    public function testSameStatusTransitionIsValid(): void
    {
        foreach (Project::STATUSES as $status) {
            $this->assertTrue(
                $this->projectService->isValidTransition($status, $status),
                "Transition from $status to itself should be valid"
            );
        }
    }

    public function testGetAllowedTransitionsFromActive(): void
    {
        $allowed = $this->projectService->getAllowedTransitions(Project::STATUS_ACTIVE);

        $this->assertContains(Project::STATUS_ON_HOLD, $allowed);
        $this->assertContains(Project::STATUS_COMPLETED, $allowed);
        $this->assertContains(Project::STATUS_CANCELLED, $allowed);
    }

    public function testGetAllowedTransitionsFromUnknownStatus(): void
    {
        $allowed = $this->projectService->getAllowedTransitions('unknown_status');

        $this->assertEmpty($allowed);
    }

    // =========================================================================
    // Create Project Tests
    // =========================================================================

    public function testCreateProject(): void
    {
        $user = $this->createUser();

        $this->projectRepository->expects($this->once())
            ->method('getMaxPositionByUser')
            ->with($user)
            ->willReturn(5);

        $this->projectRepository->expects($this->once())
            ->method('save');

        $project = $this->projectService->create($user, 'New Project');

        $this->assertSame('New Project', $project->getTitle());
        $this->assertSame(Project::STATUS_ACTIVE, $project->getStatus());
        $this->assertSame(6, $project->getPosition());
        $this->assertNull($project->getOutcome());
    }

    public function testCreateProjectWithOutcome(): void
    {
        $user = $this->createUser();

        $this->projectRepository->expects($this->once())
            ->method('getMaxPositionByUser')
            ->with($user)
            ->willReturn(0);

        $this->projectRepository->expects($this->once())
            ->method('save');

        $project = $this->projectService->create($user, 'Project with Outcome', 'Complete the feature');

        $this->assertSame('Project with Outcome', $project->getTitle());
        $this->assertSame('Complete the feature', $project->getOutcome());
    }

    // =========================================================================
    // Update Status Tests
    // =========================================================================

    public function testUpdateStatus(): void
    {
        $project = $this->createProject(Project::STATUS_ACTIVE);

        $this->projectRepository->expects($this->once())
            ->method('save')
            ->with($project);

        $result = $this->projectService->updateStatus($project, Project::STATUS_ON_HOLD);

        $this->assertSame(Project::STATUS_ON_HOLD, $result->getStatus());
    }

    public function testUpdateStatusThrowsOnInvalidTransition(): void
    {
        $project = $this->createProject(Project::STATUS_COMPLETED);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid status transition');

        $this->projectService->updateStatus($project, Project::STATUS_ON_HOLD);
    }

    public function testCompleteProject(): void
    {
        $project = $this->createProject(Project::STATUS_ACTIVE);

        $this->projectRepository->expects($this->once())
            ->method('save')
            ->with($project);

        $result = $this->projectService->complete($project);

        $this->assertSame(Project::STATUS_COMPLETED, $result->getStatus());
        $this->assertNotNull($result->getCompletedAt());
    }

    public function testPutProjectOnHold(): void
    {
        $project = $this->createProject(Project::STATUS_ACTIVE);

        $this->projectRepository->expects($this->once())
            ->method('save')
            ->with($project);

        $result = $this->projectService->putOnHold($project);

        $this->assertSame(Project::STATUS_ON_HOLD, $result->getStatus());
    }

    public function testActivateProject(): void
    {
        $project = $this->createProject(Project::STATUS_ON_HOLD);

        $this->projectRepository->expects($this->once())
            ->method('save')
            ->with($project);

        $result = $this->projectService->activate($project);

        $this->assertSame(Project::STATUS_ACTIVE, $result->getStatus());
    }

    public function testCancelProject(): void
    {
        $project = $this->createProject(Project::STATUS_ACTIVE);

        $this->projectRepository->expects($this->once())
            ->method('save')
            ->with($project);

        $result = $this->projectService->cancel($project);

        $this->assertSame(Project::STATUS_CANCELLED, $result->getStatus());
    }

    // =========================================================================
    // Next Action Tests (FR-017)
    // =========================================================================

    public function testGetNextActionReturnsFirstNextActionTask(): void
    {
        $project = $this->createProject();
        $task1 = $this->createTask(Task::STATUS_NEXT_ACTION, 0);
        $task2 = $this->createTask(Task::STATUS_NEXT_ACTION, 1);

        $this->taskRepository->expects($this->once())
            ->method('findNextActionsByProject')
            ->with($project)
            ->willReturn([$task1, $task2]);

        $result = $this->projectService->getNextAction($project);

        $this->assertSame($task1, $result);
    }

    public function testGetNextActionReturnsNullWhenNoNextActionTasks(): void
    {
        $project = $this->createProject();

        $this->taskRepository->expects($this->once())
            ->method('findNextActionsByProject')
            ->with($project)
            ->willReturn([]);

        $result = $this->projectService->getNextAction($project);

        $this->assertNull($result);
    }

    public function testHasNextActionReturnsTrueWhenNextActionExists(): void
    {
        $project = $this->createProject();
        $task = $this->createTask(Task::STATUS_NEXT_ACTION);

        $this->taskRepository->expects($this->once())
            ->method('findNextActionsByProject')
            ->with($project)
            ->willReturn([$task]);

        $this->assertTrue($this->projectService->hasNextAction($project));
    }

    public function testHasNextActionReturnsFalseWhenNoNextAction(): void
    {
        $project = $this->createProject();

        $this->taskRepository->expects($this->once())
            ->method('findNextActionsByProject')
            ->with($project)
            ->willReturn([]);

        $this->assertFalse($this->projectService->hasNextAction($project));
    }

    public function testCountNextActions(): void
    {
        $project = $this->createProject();
        $task1 = $this->createTask(Task::STATUS_NEXT_ACTION, 0);
        $task2 = $this->createTask(Task::STATUS_NEXT_ACTION, 1);

        $this->taskRepository->expects($this->once())
            ->method('findNextActionsByProject')
            ->with($project)
            ->willReturn([$task1, $task2]);

        $this->assertSame(2, $this->projectService->countNextActions($project));
    }

    // =========================================================================
    // Review Tests (FR-018)
    // =========================================================================

    public function testNeedsReviewWhenNoNextAction(): void
    {
        $project = $this->createProject();

        $this->taskRepository->expects($this->once())
            ->method('findNextActionsByProject')
            ->with($project)
            ->willReturn([]);

        $this->assertTrue($this->projectService->needsReview($project));
    }

    public function testNeedsReviewWhenReviewDatePassed(): void
    {
        $project = $this->createProject();
        $project->setReviewDate(new \DateTimeImmutable('-1 day'));
        $task = $this->createTask(Task::STATUS_NEXT_ACTION);

        $this->taskRepository->expects($this->once())
            ->method('findNextActionsByProject')
            ->with($project)
            ->willReturn([$task]);

        $this->assertTrue($this->projectService->needsReview($project));
    }

    public function testDoesNotNeedReviewWhenHasNextActionAndFutureReviewDate(): void
    {
        $project = $this->createProject();
        $project->setReviewDate(new \DateTimeImmutable('+7 days'));
        $task = $this->createTask(Task::STATUS_NEXT_ACTION);

        $this->taskRepository->expects($this->once())
            ->method('findNextActionsByProject')
            ->with($project)
            ->willReturn([$task]);

        $this->assertFalse($this->projectService->needsReview($project));
    }

    public function testDoesNotNeedReviewWhenHasNextActionAndNoReviewDate(): void
    {
        $project = $this->createProject();
        $task = $this->createTask(Task::STATUS_NEXT_ACTION);

        $this->taskRepository->expects($this->once())
            ->method('findNextActionsByProject')
            ->with($project)
            ->willReturn([$task]);

        $this->assertFalse($this->projectService->needsReview($project));
    }

    public function testGetProjectsNeedingAttention(): void
    {
        $user = $this->createUser();
        $project1 = $this->createProject();
        $project2 = $this->createProject();

        $this->projectRepository->expects($this->once())
            ->method('findWithoutNextAction')
            ->with($user)
            ->willReturn([$project1, $project2]);

        $result = $this->projectService->getProjectsNeedingAttention($user);

        $this->assertCount(2, $result);
        $this->assertContains($project1, $result);
        $this->assertContains($project2, $result);
    }

    public function testGetProjectsDueForReview(): void
    {
        $user = $this->createUser();
        $project = $this->createProject();
        $project->setReviewDate(new \DateTimeImmutable('-1 day'));

        $this->projectRepository->expects($this->once())
            ->method('findDueForReview')
            ->with($user)
            ->willReturn([$project]);

        $result = $this->projectService->getProjectsDueForReview($user);

        $this->assertCount(1, $result);
        $this->assertSame($project, $result[0]);
    }

    // =========================================================================
    // Task Count Tests
    // =========================================================================

    public function testCountTasksByProject(): void
    {
        $project = $this->createProject();

        $this->taskRepository->expects($this->once())
            ->method('countByProject')
            ->with($project)
            ->willReturn(5);

        $this->assertSame(5, $this->projectService->countTasks($project));
    }

    // =========================================================================
    // Edge Cases
    // =========================================================================

    public function testActivateCompletedProject(): void
    {
        $project = $this->createProject(Project::STATUS_COMPLETED);

        $this->projectRepository->expects($this->once())
            ->method('save')
            ->with($project);

        $result = $this->projectService->activate($project);

        $this->assertSame(Project::STATUS_ACTIVE, $result->getStatus());
    }

    public function testActivateCancelledProject(): void
    {
        $project = $this->createProject(Project::STATUS_CANCELLED);

        $this->projectRepository->expects($this->once())
            ->method('save')
            ->with($project);

        $result = $this->projectService->activate($project);

        $this->assertSame(Project::STATUS_ACTIVE, $result->getStatus());
    }

    public function testCannotCompleteOnHoldProject(): void
    {
        $project = $this->createProject(Project::STATUS_ON_HOLD);

        $this->expectException(\InvalidArgumentException::class);

        $this->projectService->complete($project);
    }

    public function testCannotPutCompletedProjectOnHold(): void
    {
        $project = $this->createProject(Project::STATUS_COMPLETED);

        $this->expectException(\InvalidArgumentException::class);

        $this->projectService->putOnHold($project);
    }
}
