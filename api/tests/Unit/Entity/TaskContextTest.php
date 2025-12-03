<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Context;
use App\Entity\Task;
use App\Entity\TaskContext;
use App\Entity\User;
use PHPUnit\Framework\TestCase;

class TaskContextTest extends TestCase
{
    private function createUser(): User
    {
        $user = new User();
        $user->setEmail('test@example.com');
        return $user;
    }

    private function createTask(): Task
    {
        $task = new Task();
        $task->setTitle('Test Task');
        $task->setUser($this->createUser());
        return $task;
    }

    private function createContext(): Context
    {
        $context = new Context();
        $context->setName('@Office');
        return $context;
    }

    // =========================================================================
    // Creation Tests
    // =========================================================================

    public function testTaskContextCreation(): void
    {
        $task = $this->createTask();
        $context = $this->createContext();

        $taskContext = new TaskContext($task, $context);

        $this->assertSame($task, $taskContext->getTask());
        $this->assertSame($context, $taskContext->getContext());
        $this->assertInstanceOf(\DateTimeImmutable::class, $taskContext->getCreatedAt());
    }

    public function testTaskContextCreationWithDifferentContexts(): void
    {
        $task = $this->createTask();

        $contextNames = ['@Office', '@Home', '@Phone', '@Errands'];

        foreach ($contextNames as $name) {
            $context = new Context();
            $context->setName($name);

            $taskContext = new TaskContext($task, $context);

            $this->assertSame($task, $taskContext->getTask());
            $this->assertSame($context, $taskContext->getContext());
            $this->assertEquals($name, $taskContext->getContext()->getName());
        }
    }

    // =========================================================================
    // Getter Tests
    // =========================================================================

    public function testGetTask(): void
    {
        $task = $this->createTask();
        $context = $this->createContext();

        $taskContext = new TaskContext($task, $context);

        $this->assertSame($task, $taskContext->getTask());
        $this->assertEquals('Test Task', $taskContext->getTask()->getTitle());
    }

    public function testGetContext(): void
    {
        $task = $this->createTask();
        $context = $this->createContext();

        $taskContext = new TaskContext($task, $context);

        $this->assertSame($context, $taskContext->getContext());
        $this->assertEquals('@Office', $taskContext->getContext()->getName());
    }

    public function testGetCreatedAt(): void
    {
        $task = $this->createTask();
        $context = $this->createContext();

        $beforeCreation = new \DateTimeImmutable();
        $taskContext = new TaskContext($task, $context);
        $afterCreation = new \DateTimeImmutable();

        $this->assertInstanceOf(\DateTimeImmutable::class, $taskContext->getCreatedAt());
        $this->assertGreaterThanOrEqual($beforeCreation, $taskContext->getCreatedAt());
        $this->assertLessThanOrEqual($afterCreation, $taskContext->getCreatedAt());
    }

    // =========================================================================
    // toArray Tests
    // =========================================================================

    public function testToArray(): void
    {
        $task = $this->createTask();
        $context = $this->createContext();

        $taskContext = new TaskContext($task, $context);

        $array = $taskContext->toArray();

        $this->assertIsArray($array);
        $this->assertArrayHasKey('task_id', $array);
        $this->assertArrayHasKey('context_id', $array);
        $this->assertArrayHasKey('created_at', $array);

        $this->assertEquals($task->getId()->toRfc4122(), $array['task_id']);
        $this->assertEquals($context->getId()->toRfc4122(), $array['context_id']);
    }

    // =========================================================================
    // Multiple Contexts per Task
    // =========================================================================

    public function testMultipleContextsCanBeAssociatedWithSameTask(): void
    {
        $task = $this->createTask();

        $context1 = new Context();
        $context1->setName('@Office');

        $context2 = new Context();
        $context2->setName('@Computer');

        $taskContext1 = new TaskContext($task, $context1);
        $taskContext2 = new TaskContext($task, $context2);

        $this->assertSame($task, $taskContext1->getTask());
        $this->assertSame($task, $taskContext2->getTask());
        $this->assertNotSame($taskContext1->getContext(), $taskContext2->getContext());
        $this->assertEquals('@Office', $taskContext1->getContext()->getName());
        $this->assertEquals('@Computer', $taskContext2->getContext()->getName());
    }

    // =========================================================================
    // Same Context with Multiple Tasks
    // =========================================================================

    public function testSameContextCanBeAssociatedWithMultipleTasks(): void
    {
        $user = $this->createUser();

        $task1 = new Task();
        $task1->setTitle('Task 1');
        $task1->setUser($user);

        $task2 = new Task();
        $task2->setTitle('Task 2');
        $task2->setUser($user);

        $context = $this->createContext();

        $taskContext1 = new TaskContext($task1, $context);
        $taskContext2 = new TaskContext($task2, $context);

        $this->assertSame($context, $taskContext1->getContext());
        $this->assertSame($context, $taskContext2->getContext());
        $this->assertNotSame($taskContext1->getTask(), $taskContext2->getTask());
        $this->assertEquals('Task 1', $taskContext1->getTask()->getTitle());
        $this->assertEquals('Task 2', $taskContext2->getTask()->getTitle());
    }

    // =========================================================================
    // Default Context Association
    // =========================================================================

    public function testTaskCanBeAssociatedWithDefaultContext(): void
    {
        $task = $this->createTask();

        $defaultContext = Context::createDefault('@Office', 'building', '#3498db');

        $taskContext = new TaskContext($task, $defaultContext);

        $this->assertSame($task, $taskContext->getTask());
        $this->assertSame($defaultContext, $taskContext->getContext());
        $this->assertTrue($taskContext->getContext()->isDefault());
        $this->assertNull($taskContext->getContext()->getUser());
    }
}
