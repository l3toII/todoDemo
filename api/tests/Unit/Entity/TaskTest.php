<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Task;
use App\Entity\User;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

class TaskTest extends TestCase
{
    private function createUser(): User
    {
        $user = new User();
        $user->setEmail('test@example.com');
        return $user;
    }

    public function testTaskCreation(): void
    {
        $task = new Task();

        $this->assertInstanceOf(Uuid::class, $task->getId());
        $this->assertInstanceOf(\DateTimeImmutable::class, $task->getCreatedAt());
        $this->assertInstanceOf(\DateTimeImmutable::class, $task->getUpdatedAt());
        $this->assertEquals(Task::STATUS_INBOX, $task->getStatus());
        $this->assertEquals(0, $task->getPosition());
        $this->assertEquals(1, $task->getVersion());
        $this->assertNull($task->getNotes());
        $this->assertNull($task->getEnergyLevel());
        $this->assertNull($task->getTimeEstimate());
        $this->assertNull($task->getDueDate());
        $this->assertNull($task->getDueTime());
        $this->assertNull($task->getCompletedAt());
        $this->assertNull($task->getDeletedAt());
        $this->assertNull($task->getProject());
    }

    public function testTitleGetterSetter(): void
    {
        $task = new Task();
        $title = 'Buy groceries';

        $task->setTitle($title);

        $this->assertEquals($title, $task->getTitle());
    }

    public function testUserGetterSetter(): void
    {
        $task = new Task();
        $user = $this->createUser();

        $task->setUser($user);

        $this->assertSame($user, $task->getUser());
    }

    public function testNotesGetterSetter(): void
    {
        $task = new Task();
        $notes = 'Remember to check for discounts';

        $task->setNotes($notes);

        $this->assertEquals($notes, $task->getNotes());

        $task->setNotes(null);
        $this->assertNull($task->getNotes());
    }

    // =========================================================================
    // Status Tests
    // =========================================================================

    public function testStatusGetterSetter(): void
    {
        $task = new Task();

        foreach (Task::STATUSES as $status) {
            $task->setStatus($status);
            $this->assertEquals($status, $task->getStatus());
        }
    }

    public function testIsInbox(): void
    {
        $task = new Task();
        $this->assertTrue($task->isInbox());

        $task->setStatus(Task::STATUS_NEXT_ACTION);
        $this->assertFalse($task->isInbox());
    }

    public function testIsCompleted(): void
    {
        $task = new Task();
        $this->assertFalse($task->isCompleted());

        $task->setStatus(Task::STATUS_COMPLETED);
        $this->assertTrue($task->isCompleted());
    }

    public function testIsDeleted(): void
    {
        $task = new Task();
        $this->assertFalse($task->isDeleted());

        $task->setStatus(Task::STATUS_DELETED);
        $this->assertTrue($task->isDeleted());
    }

    public function testIsActionable(): void
    {
        $task = new Task();

        $this->assertFalse($task->isActionable());

        $task->setStatus(Task::STATUS_NEXT_ACTION);
        $this->assertTrue($task->isActionable());

        $task->setStatus(Task::STATUS_WAITING_FOR);
        $this->assertTrue($task->isActionable());

        $task->setStatus(Task::STATUS_SOMEDAY_MAYBE);
        $this->assertFalse($task->isActionable());

        $task->setStatus(Task::STATUS_REFERENCE);
        $this->assertFalse($task->isActionable());
    }

    public function testSetStatusToCompletedAutoSetsCompletedAt(): void
    {
        $task = new Task();
        $this->assertNull($task->getCompletedAt());

        $beforeTime = new \DateTimeImmutable();
        $task->setStatus(Task::STATUS_COMPLETED);
        $afterTime = new \DateTimeImmutable();

        $this->assertNotNull($task->getCompletedAt());
        $this->assertGreaterThanOrEqual($beforeTime, $task->getCompletedAt());
        $this->assertLessThanOrEqual($afterTime, $task->getCompletedAt());
    }

    public function testSetStatusToDeletedAutoSetsDeletedAt(): void
    {
        $task = new Task();
        $this->assertNull($task->getDeletedAt());

        $beforeTime = new \DateTimeImmutable();
        $task->setStatus(Task::STATUS_DELETED);
        $afterTime = new \DateTimeImmutable();

        $this->assertNotNull($task->getDeletedAt());
        $this->assertGreaterThanOrEqual($beforeTime, $task->getDeletedAt());
        $this->assertLessThanOrEqual($afterTime, $task->getDeletedAt());
    }

    public function testMarkAsCompleted(): void
    {
        $task = new Task();

        $beforeTime = new \DateTimeImmutable();
        $task->markAsCompleted();
        $afterTime = new \DateTimeImmutable();

        $this->assertEquals(Task::STATUS_COMPLETED, $task->getStatus());
        $this->assertNotNull($task->getCompletedAt());
        $this->assertGreaterThanOrEqual($beforeTime, $task->getCompletedAt());
        $this->assertLessThanOrEqual($afterTime, $task->getCompletedAt());
    }

    public function testMarkAsDeleted(): void
    {
        $task = new Task();

        $beforeTime = new \DateTimeImmutable();
        $task->markAsDeleted();
        $afterTime = new \DateTimeImmutable();

        $this->assertEquals(Task::STATUS_DELETED, $task->getStatus());
        $this->assertNotNull($task->getDeletedAt());
        $this->assertGreaterThanOrEqual($beforeTime, $task->getDeletedAt());
        $this->assertLessThanOrEqual($afterTime, $task->getDeletedAt());
    }

    public function testRestore(): void
    {
        $task = new Task();
        $task->markAsDeleted();

        $this->assertEquals(Task::STATUS_DELETED, $task->getStatus());
        $this->assertNotNull($task->getDeletedAt());

        $task->restore();

        $this->assertEquals(Task::STATUS_INBOX, $task->getStatus());
        $this->assertNull($task->getDeletedAt());
    }

    public function testRestoreDoesNothingIfNotDeleted(): void
    {
        $task = new Task();
        $task->setStatus(Task::STATUS_NEXT_ACTION);

        $task->restore();

        $this->assertEquals(Task::STATUS_NEXT_ACTION, $task->getStatus());
    }

    // =========================================================================
    // Energy Level Tests
    // =========================================================================

    public function testEnergyLevelGetterSetter(): void
    {
        $task = new Task();

        foreach (Task::ENERGY_LEVELS as $level) {
            $task->setEnergyLevel($level);
            $this->assertEquals($level, $task->getEnergyLevel());
        }

        $task->setEnergyLevel(null);
        $this->assertNull($task->getEnergyLevel());
    }

    // =========================================================================
    // Time Estimate Tests
    // =========================================================================

    public function testTimeEstimateGetterSetter(): void
    {
        $task = new Task();

        $task->setTimeEstimate(30);
        $this->assertEquals(30, $task->getTimeEstimate());

        $task->setTimeEstimate(null);
        $this->assertNull($task->getTimeEstimate());
    }

    // =========================================================================
    // Due Date Tests
    // =========================================================================

    public function testDueDateGetterSetter(): void
    {
        $task = new Task();
        $dueDate = new \DateTimeImmutable('2025-12-31');

        $task->setDueDate($dueDate);

        $this->assertEquals($dueDate, $task->getDueDate());

        $task->setDueDate(null);
        $this->assertNull($task->getDueDate());
    }

    public function testDueTimeGetterSetter(): void
    {
        $task = new Task();
        $dueTime = new \DateTimeImmutable('14:30:00');

        $task->setDueTime($dueTime);

        $this->assertEquals($dueTime, $task->getDueTime());

        $task->setDueTime(null);
        $this->assertNull($task->getDueTime());
    }

    public function testIsOverdueWhenNoDueDate(): void
    {
        $task = new Task();
        $this->assertFalse($task->isOverdue());
    }

    public function testIsOverdueWhenCompleted(): void
    {
        $task = new Task();
        $task->setDueDate(new \DateTimeImmutable('-1 day'));
        $task->setStatus(Task::STATUS_COMPLETED);

        $this->assertFalse($task->isOverdue());
    }

    public function testIsOverdueWhenDeleted(): void
    {
        $task = new Task();
        $task->setDueDate(new \DateTimeImmutable('-1 day'));
        $task->setStatus(Task::STATUS_DELETED);

        $this->assertFalse($task->isOverdue());
    }

    public function testIsOverdueWhenPastDue(): void
    {
        $task = new Task();
        $task->setTitle('Test task');
        $task->setDueDate(new \DateTimeImmutable('-1 day'));

        $this->assertTrue($task->isOverdue());
    }

    public function testIsOverdueWhenFutureDue(): void
    {
        $task = new Task();
        $task->setTitle('Test task');
        $task->setDueDate(new \DateTimeImmutable('+1 day'));

        $this->assertFalse($task->isOverdue());
    }

    public function testIsDueTodayWhenNoDueDate(): void
    {
        $task = new Task();
        $this->assertFalse($task->isDueToday());
    }

    public function testIsDueTodayWhenToday(): void
    {
        $task = new Task();
        $task->setTitle('Test task');
        $task->setDueDate(new \DateTimeImmutable('today'));

        $this->assertTrue($task->isDueToday());
    }

    public function testIsDueTodayWhenTomorrow(): void
    {
        $task = new Task();
        $task->setTitle('Test task');
        $task->setDueDate(new \DateTimeImmutable('tomorrow'));

        $this->assertFalse($task->isDueToday());
    }

    public function testIsDueSoonWhenNoDueDate(): void
    {
        $task = new Task();
        $this->assertFalse($task->isDueSoon());
    }

    public function testIsDueSoonWithinDefaultRange(): void
    {
        $task = new Task();
        $task->setTitle('Test task');
        $task->setDueDate(new \DateTimeImmutable('+3 days'));

        $this->assertTrue($task->isDueSoon());
    }

    public function testIsDueSoonOutsideDefaultRange(): void
    {
        $task = new Task();
        $task->setTitle('Test task');
        $task->setDueDate(new \DateTimeImmutable('+10 days'));

        $this->assertFalse($task->isDueSoon());
    }

    public function testIsDueSoonWithCustomRange(): void
    {
        $task = new Task();
        $task->setTitle('Test task');
        $task->setDueDate(new \DateTimeImmutable('+10 days'));

        $this->assertFalse($task->isDueSoon(7));
        $this->assertTrue($task->isDueSoon(14));
    }

    public function testIsDueSoonWhenPastDue(): void
    {
        $task = new Task();
        $task->setTitle('Test task');
        $task->setDueDate(new \DateTimeImmutable('-1 day'));

        $this->assertFalse($task->isDueSoon());
    }

    // =========================================================================
    // Position Tests
    // =========================================================================

    public function testPositionGetterSetter(): void
    {
        $task = new Task();

        $task->setPosition(5);
        $this->assertEquals(5, $task->getPosition());

        $task->setPosition(0);
        $this->assertEquals(0, $task->getPosition());
    }

    // =========================================================================
    // CompletedAt and DeletedAt Manual Setters
    // =========================================================================

    public function testCompletedAtGetterSetter(): void
    {
        $task = new Task();
        $completedAt = new \DateTimeImmutable('2025-01-15 10:00:00');

        $task->setCompletedAt($completedAt);

        $this->assertEquals($completedAt, $task->getCompletedAt());
    }

    public function testDeletedAtGetterSetter(): void
    {
        $task = new Task();
        $deletedAt = new \DateTimeImmutable('2025-01-15 10:00:00');

        $task->setDeletedAt($deletedAt);

        $this->assertEquals($deletedAt, $task->getDeletedAt());
    }

    // =========================================================================
    // Lifecycle Callback Tests
    // =========================================================================

    public function testOnPreUpdate(): void
    {
        $task = new Task();
        $originalUpdatedAt = $task->getUpdatedAt();

        usleep(1000);

        $task->onPreUpdate();

        $this->assertNotEquals($originalUpdatedAt, $task->getUpdatedAt());
        $this->assertGreaterThan($originalUpdatedAt, $task->getUpdatedAt());
    }

    // =========================================================================
    // toArray Tests
    // =========================================================================

    public function testToArray(): void
    {
        $task = new Task();
        $user = $this->createUser();
        $task->setUser($user);
        $task->setTitle('Test task');
        $task->setNotes('Some notes');
        $task->setStatus(Task::STATUS_NEXT_ACTION);
        $task->setEnergyLevel(Task::ENERGY_HIGH);
        $task->setTimeEstimate(45);
        $task->setDueDate(new \DateTimeImmutable('2025-12-31'));
        $task->setPosition(3);

        $array = $task->toArray();

        $this->assertIsArray($array);
        $this->assertArrayHasKey('id', $array);
        $this->assertArrayHasKey('title', $array);
        $this->assertArrayHasKey('notes', $array);
        $this->assertArrayHasKey('status', $array);
        $this->assertArrayHasKey('energy_level', $array);
        $this->assertArrayHasKey('time_estimate', $array);
        $this->assertArrayHasKey('due_date', $array);
        $this->assertArrayHasKey('position', $array);
        $this->assertArrayHasKey('version', $array);
        $this->assertArrayHasKey('created_at', $array);
        $this->assertArrayHasKey('updated_at', $array);
        $this->assertArrayHasKey('completed_at', $array);
        $this->assertArrayHasKey('is_overdue', $array);
        $this->assertArrayHasKey('is_due_today', $array);

        $this->assertEquals('Test task', $array['title']);
        $this->assertEquals('Some notes', $array['notes']);
        $this->assertEquals(Task::STATUS_NEXT_ACTION, $array['status']);
        $this->assertEquals(Task::ENERGY_HIGH, $array['energy_level']);
        $this->assertEquals(45, $array['time_estimate']);
        $this->assertEquals('2025-12-31', $array['due_date']);
        $this->assertEquals(3, $array['position']);
    }

    public function testToArrayWithMinimalData(): void
    {
        $task = new Task();
        $user = $this->createUser();
        $task->setUser($user);
        $task->setTitle('Minimal task');

        $array = $task->toArray();

        $this->assertEquals('Minimal task', $array['title']);
        $this->assertNull($array['notes']);
        $this->assertNull($array['energy_level']);
        $this->assertNull($array['time_estimate']);
        $this->assertNull($array['due_date']);
        $this->assertNull($array['due_time']);
        $this->assertNull($array['completed_at']);
        $this->assertNull($array['project_id']);
    }

    // =========================================================================
    // Constants Tests
    // =========================================================================

    public function testStatusConstants(): void
    {
        $this->assertEquals('inbox', Task::STATUS_INBOX);
        $this->assertEquals('clarified', Task::STATUS_CLARIFIED);
        $this->assertEquals('next_action', Task::STATUS_NEXT_ACTION);
        $this->assertEquals('waiting_for', Task::STATUS_WAITING_FOR);
        $this->assertEquals('someday_maybe', Task::STATUS_SOMEDAY_MAYBE);
        $this->assertEquals('reference', Task::STATUS_REFERENCE);
        $this->assertEquals('completed', Task::STATUS_COMPLETED);
        $this->assertEquals('deleted', Task::STATUS_DELETED);
    }

    public function testEnergyLevelConstants(): void
    {
        $this->assertEquals('low', Task::ENERGY_LOW);
        $this->assertEquals('medium', Task::ENERGY_MEDIUM);
        $this->assertEquals('high', Task::ENERGY_HIGH);
    }

    public function testStatusesArray(): void
    {
        $this->assertCount(8, Task::STATUSES);
        $this->assertContains(Task::STATUS_INBOX, Task::STATUSES);
        $this->assertContains(Task::STATUS_CLARIFIED, Task::STATUSES);
        $this->assertContains(Task::STATUS_NEXT_ACTION, Task::STATUSES);
        $this->assertContains(Task::STATUS_WAITING_FOR, Task::STATUSES);
        $this->assertContains(Task::STATUS_SOMEDAY_MAYBE, Task::STATUSES);
        $this->assertContains(Task::STATUS_REFERENCE, Task::STATUSES);
        $this->assertContains(Task::STATUS_COMPLETED, Task::STATUSES);
        $this->assertContains(Task::STATUS_DELETED, Task::STATUSES);
    }

    public function testEnergyLevelsArray(): void
    {
        $this->assertCount(3, Task::ENERGY_LEVELS);
        $this->assertContains(Task::ENERGY_LOW, Task::ENERGY_LEVELS);
        $this->assertContains(Task::ENERGY_MEDIUM, Task::ENERGY_LEVELS);
        $this->assertContains(Task::ENERGY_HIGH, Task::ENERGY_LEVELS);
    }
}
