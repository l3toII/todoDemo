<?php

declare(strict_types=1);

namespace App\Tests\Unit\Service;

use App\Entity\Task;
use App\Entity\User;
use App\Repository\TaskRepository;
use App\Service\TaskService;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class TaskServiceTest extends TestCase
{
    private TaskService $taskService;
    private TaskRepository&MockObject $taskRepository;

    protected function setUp(): void
    {
        $this->taskRepository = $this->createMock(TaskRepository::class);
        $this->taskService = new TaskService($this->taskRepository);
    }

    private function createTask(string $status = Task::STATUS_INBOX): Task
    {
        $user = $this->createMock(User::class);
        $task = new Task();
        $task->setUser($user);
        $task->setTitle('Test Task');

        // Use reflection to set status directly without triggering validation
        $reflection = new \ReflectionClass($task);
        $property = $reflection->getProperty('status');
        $property->setAccessible(true);
        $property->setValue($task, $status);

        return $task;
    }

    // =========================================================================
    // Status Transition Validation Tests
    // =========================================================================

    public function testIsValidTransitionFromInbox(): void
    {
        // Valid transitions from inbox
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_INBOX, Task::STATUS_NEXT_ACTION));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_INBOX, Task::STATUS_WAITING_FOR));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_INBOX, Task::STATUS_SOMEDAY_MAYBE));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_INBOX, Task::STATUS_REFERENCE));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_INBOX, Task::STATUS_COMPLETED));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_INBOX, Task::STATUS_DELETED));

        // Invalid transitions from inbox
        $this->assertFalse($this->taskService->isValidTransition(Task::STATUS_INBOX, Task::STATUS_CLARIFIED));
    }

    public function testIsValidTransitionFromNextAction(): void
    {
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_NEXT_ACTION, Task::STATUS_WAITING_FOR));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_NEXT_ACTION, Task::STATUS_SOMEDAY_MAYBE));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_NEXT_ACTION, Task::STATUS_COMPLETED));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_NEXT_ACTION, Task::STATUS_DELETED));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_NEXT_ACTION, Task::STATUS_INBOX));

        // Cannot go to reference from next_action
        $this->assertFalse($this->taskService->isValidTransition(Task::STATUS_NEXT_ACTION, Task::STATUS_REFERENCE));
    }

    public function testIsValidTransitionFromWaitingFor(): void
    {
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_WAITING_FOR, Task::STATUS_NEXT_ACTION));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_WAITING_FOR, Task::STATUS_SOMEDAY_MAYBE));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_WAITING_FOR, Task::STATUS_COMPLETED));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_WAITING_FOR, Task::STATUS_DELETED));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_WAITING_FOR, Task::STATUS_INBOX));
    }

    public function testIsValidTransitionFromSomedayMaybe(): void
    {
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_SOMEDAY_MAYBE, Task::STATUS_NEXT_ACTION));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_SOMEDAY_MAYBE, Task::STATUS_WAITING_FOR));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_SOMEDAY_MAYBE, Task::STATUS_REFERENCE));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_SOMEDAY_MAYBE, Task::STATUS_COMPLETED));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_SOMEDAY_MAYBE, Task::STATUS_DELETED));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_SOMEDAY_MAYBE, Task::STATUS_INBOX));
    }

    public function testIsValidTransitionFromReference(): void
    {
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_REFERENCE, Task::STATUS_SOMEDAY_MAYBE));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_REFERENCE, Task::STATUS_DELETED));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_REFERENCE, Task::STATUS_INBOX));

        // Cannot become actionable directly from reference
        $this->assertFalse($this->taskService->isValidTransition(Task::STATUS_REFERENCE, Task::STATUS_NEXT_ACTION));
        $this->assertFalse($this->taskService->isValidTransition(Task::STATUS_REFERENCE, Task::STATUS_WAITING_FOR));
    }

    public function testIsValidTransitionFromCompleted(): void
    {
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_COMPLETED, Task::STATUS_INBOX));
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_COMPLETED, Task::STATUS_DELETED));

        // Cannot reopen to other statuses directly
        $this->assertFalse($this->taskService->isValidTransition(Task::STATUS_COMPLETED, Task::STATUS_NEXT_ACTION));
    }

    public function testIsValidTransitionFromDeleted(): void
    {
        $this->assertTrue($this->taskService->isValidTransition(Task::STATUS_DELETED, Task::STATUS_INBOX));

        // Cannot go anywhere else from deleted
        $this->assertFalse($this->taskService->isValidTransition(Task::STATUS_DELETED, Task::STATUS_NEXT_ACTION));
        $this->assertFalse($this->taskService->isValidTransition(Task::STATUS_DELETED, Task::STATUS_COMPLETED));
    }

    public function testSameStatusTransitionIsValid(): void
    {
        foreach (Task::STATUSES as $status) {
            $this->assertTrue(
                $this->taskService->isValidTransition($status, $status),
                "Transition from $status to itself should be valid"
            );
        }
    }

    // =========================================================================
    // Get Allowed Transitions Tests
    // =========================================================================

    public function testGetAllowedTransitionsFromInbox(): void
    {
        $allowed = $this->taskService->getAllowedTransitions(Task::STATUS_INBOX);

        $this->assertContains(Task::STATUS_NEXT_ACTION, $allowed);
        $this->assertContains(Task::STATUS_WAITING_FOR, $allowed);
        $this->assertContains(Task::STATUS_SOMEDAY_MAYBE, $allowed);
        $this->assertContains(Task::STATUS_REFERENCE, $allowed);
        $this->assertContains(Task::STATUS_COMPLETED, $allowed);
        $this->assertContains(Task::STATUS_DELETED, $allowed);
    }

    public function testGetAllowedTransitionsFromUnknownStatus(): void
    {
        $allowed = $this->taskService->getAllowedTransitions('unknown_status');

        $this->assertEmpty($allowed);
    }

    // =========================================================================
    // Clarify Method Tests
    // =========================================================================

    public function testClarifyToNextAction(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->clarify($task, Task::STATUS_NEXT_ACTION);

        $this->assertSame(Task::STATUS_NEXT_ACTION, $result->getStatus());
    }

    public function testClarifyWithOptions(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->clarify($task, Task::STATUS_NEXT_ACTION, [
            'energy_level' => Task::ENERGY_HIGH,
            'time_estimate' => 30,
            'notes' => 'Important task',
        ]);

        $this->assertSame(Task::STATUS_NEXT_ACTION, $result->getStatus());
        $this->assertSame(Task::ENERGY_HIGH, $result->getEnergyLevel());
        $this->assertSame(30, $result->getTimeEstimate());
        $this->assertSame('Important task', $result->getNotes());
    }

    public function testClarifyWithDueDate(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->clarify($task, Task::STATUS_NEXT_ACTION, [
            'due_date' => '2025-12-31',
        ]);

        $this->assertNotNull($result->getDueDate());
        $this->assertSame('2025-12-31', $result->getDueDate()->format('Y-m-d'));
    }

    public function testClarifyThrowsOnInvalidTransition(): void
    {
        $task = $this->createTask(Task::STATUS_REFERENCE);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid status transition from "reference" to "next_action"');

        $this->taskService->clarify($task, Task::STATUS_NEXT_ACTION);
    }

    public function testClarifyThrowsOnInvalidTargetStatus(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid status transition');

        $this->taskService->clarify($task, 'invalid_status');
    }

    public function testClarifyIgnoresInvalidEnergyLevel(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->clarify($task, Task::STATUS_NEXT_ACTION, [
            'energy_level' => 'invalid_level',
        ]);

        $this->assertNull($result->getEnergyLevel());
    }

    public function testClarifyIgnoresInvalidTimeEstimate(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->clarify($task, Task::STATUS_NEXT_ACTION, [
            'time_estimate' => -5,
        ]);

        $this->assertNull($result->getTimeEstimate());
    }

    // =========================================================================
    // Helper Method Tests
    // =========================================================================

    public function testCompleteQuickly(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->completeQuickly($task);

        $this->assertSame(Task::STATUS_COMPLETED, $result->getStatus());
        $this->assertSame(2, $result->getTimeEstimate());
    }

    public function testDeferToSomedayMaybe(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);
        $task->setNotes('Original notes');

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->deferToSomedayMaybe($task, 'Deferred because low priority');

        $this->assertSame(Task::STATUS_SOMEDAY_MAYBE, $result->getStatus());
        $this->assertStringContainsString('Original notes', $result->getNotes());
        $this->assertStringContainsString('Deferred because low priority', $result->getNotes());
    }

    public function testDeferToSomedayMaybeWithoutNotes(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->deferToSomedayMaybe($task);

        $this->assertSame(Task::STATUS_SOMEDAY_MAYBE, $result->getStatus());
    }

    public function testMoveToReference(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->moveToReference($task);

        $this->assertSame(Task::STATUS_REFERENCE, $result->getStatus());
    }

    public function testDelegateTo(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);
        $dueDate = new \DateTimeImmutable('2025-12-31');

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->delegateTo($task, 'John Doe', $dueDate);

        $this->assertSame(Task::STATUS_WAITING_FOR, $result->getStatus());
        $this->assertStringContainsString('Waiting for: John Doe', $result->getNotes());
        $this->assertNotNull($result->getDueDate());
        $this->assertSame('2025-12-31', $result->getDueDate()->format('Y-m-d'));
    }

    public function testDelegateToWithoutDueDate(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->delegateTo($task, 'Jane Doe');

        $this->assertSame(Task::STATUS_WAITING_FOR, $result->getStatus());
        $this->assertStringContainsString('Waiting for: Jane Doe', $result->getNotes());
        $this->assertNull($result->getDueDate());
    }

    public function testMakeNextAction(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);
        $dueDate = new \DateTimeImmutable('2025-12-31');

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->makeNextAction($task, Task::ENERGY_MEDIUM, 45, $dueDate);

        $this->assertSame(Task::STATUS_NEXT_ACTION, $result->getStatus());
        $this->assertSame(Task::ENERGY_MEDIUM, $result->getEnergyLevel());
        $this->assertSame(45, $result->getTimeEstimate());
        $this->assertSame('2025-12-31', $result->getDueDate()->format('Y-m-d'));
    }

    public function testMakeNextActionMinimal(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->makeNextAction($task);

        $this->assertSame(Task::STATUS_NEXT_ACTION, $result->getStatus());
    }

    public function testSendBackToInbox(): void
    {
        $task = $this->createTask(Task::STATUS_NEXT_ACTION);

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->sendBackToInbox($task);

        $this->assertSame(Task::STATUS_INBOX, $result->getStatus());
    }

    public function testTrash(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->trash($task);

        $this->assertSame(Task::STATUS_DELETED, $result->getStatus());
    }

    // =========================================================================
    // Edge Cases
    // =========================================================================

    public function testClarifyFromDeletedToInbox(): void
    {
        $task = $this->createTask(Task::STATUS_DELETED);

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->clarify($task, Task::STATUS_INBOX);

        $this->assertSame(Task::STATUS_INBOX, $result->getStatus());
    }

    public function testClarifyFromCompletedToInbox(): void
    {
        $task = $this->createTask(Task::STATUS_COMPLETED);

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->clarify($task, Task::STATUS_INBOX);

        $this->assertSame(Task::STATUS_INBOX, $result->getStatus());
    }

    public function testClarifyWithInvalidDateFormat(): void
    {
        $task = $this->createTask(Task::STATUS_INBOX);

        $this->taskRepository->expects($this->once())
            ->method('save')
            ->with($task);

        $result = $this->taskService->clarify($task, Task::STATUS_NEXT_ACTION, [
            'due_date' => 'not-a-date',
        ]);

        // Should not throw, just skip invalid date
        $this->assertNull($result->getDueDate());
    }
}
