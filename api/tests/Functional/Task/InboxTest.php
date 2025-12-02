<?php

declare(strict_types=1);

namespace App\Tests\Functional\Task;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

/**
 * Functional tests for Task capture and inbox endpoints (FR-007, FR-008)
 */
class InboxTest extends WebTestCase
{
    private $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    // =========================================================================
    // Quick Capture Tests (FR-007)
    // =========================================================================

    public function testCreateTaskSuccess(): void
    {
        $tokens = $this->authenticateUser();

        $this->client->request('POST', '/api/v1/tasks', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => 'Buy groceries',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('message', $response);
        $this->assertArrayHasKey('task', $response);
        $this->assertEquals('Buy groceries', $response['task']['title']);
        $this->assertEquals('inbox', $response['task']['status']);
        $this->assertArrayHasKey('id', $response['task']);
        $this->assertArrayHasKey('created_at', $response['task']);
    }

    public function testCreateTaskWithNotes(): void
    {
        $tokens = $this->authenticateUser();

        $this->client->request('POST', '/api/v1/tasks', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => 'Call the dentist',
            'notes' => 'Ask about the appointment next week',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('Call the dentist', $response['task']['title']);
        $this->assertEquals('Ask about the appointment next week', $response['task']['notes']);
    }

    public function testCreateTaskMissingTitle(): void
    {
        $tokens = $this->authenticateUser();

        $this->client->request('POST', '/api/v1/tasks', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'notes' => 'Some notes without title',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('MISSING_TITLE', $response['code']);
    }

    public function testCreateTaskEmptyTitle(): void
    {
        $tokens = $this->authenticateUser();

        $this->client->request('POST', '/api/v1/tasks', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => '   ',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('MISSING_TITLE', $response['code']);
    }

    public function testCreateTaskUnauthenticated(): void
    {
        $this->client->request('POST', '/api/v1/tasks', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => 'Test task',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    // =========================================================================
    // Inbox List Tests (FR-008)
    // =========================================================================

    public function testGetInboxEmpty(): void
    {
        $tokens = $this->authenticateUser('inbox-empty@example.com');

        $this->client->request('GET', '/api/v1/tasks/inbox', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('tasks', $response);
        $this->assertArrayHasKey('count', $response);
        $this->assertArrayHasKey('has_overflow', $response);
        $this->assertIsArray($response['tasks']);
        $this->assertEquals(0, $response['count']);
        $this->assertFalse($response['has_overflow']);
    }

    public function testGetInboxWithTasks(): void
    {
        $tokens = $this->authenticateUser('inbox-tasks@example.com');

        // Create some tasks
        $this->createTask($tokens['access_token'], 'Task 1');
        $this->createTask($tokens['access_token'], 'Task 2');
        $this->createTask($tokens['access_token'], 'Task 3');

        $this->client->request('GET', '/api/v1/tasks/inbox', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals(3, $response['count']);
        $this->assertCount(3, $response['tasks']);
        $this->assertFalse($response['has_overflow']);
    }

    public function testGetInboxCount(): void
    {
        $tokens = $this->authenticateUser('inbox-count@example.com');

        // Create some tasks
        $this->createTask($tokens['access_token'], 'Task A');
        $this->createTask($tokens['access_token'], 'Task B');

        $this->client->request('GET', '/api/v1/tasks/inbox/count', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('count', $response);
        $this->assertEquals(2, $response['count']);
    }

    public function testGetInboxUnauthenticated(): void
    {
        $this->client->request('GET', '/api/v1/tasks/inbox');

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    // =========================================================================
    // Task CRUD Tests
    // =========================================================================

    public function testGetTaskSuccess(): void
    {
        $tokens = $this->authenticateUser('get-task@example.com');
        $taskId = $this->createTask($tokens['access_token'], 'Test task to get');

        $this->client->request('GET', '/api/v1/tasks/' . $taskId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('task', $response);
        $this->assertEquals($taskId, $response['task']['id']);
        $this->assertEquals('Test task to get', $response['task']['title']);
    }

    public function testGetTaskNotFound(): void
    {
        $tokens = $this->authenticateUser('get-not-found@example.com');

        $this->client->request('GET', '/api/v1/tasks/00000000-0000-0000-0000-000000000000', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    public function testGetTaskInvalidId(): void
    {
        $tokens = $this->authenticateUser('get-invalid@example.com');

        // Invalid UUID format doesn't match the route requirements, returns 404
        $this->client->request('GET', '/api/v1/tasks/invalid-uuid', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    public function testUpdateTaskSuccess(): void
    {
        $tokens = $this->authenticateUser('update-task@example.com');
        $taskId = $this->createTask($tokens['access_token'], 'Original title');

        $this->client->request('PATCH', '/api/v1/tasks/' . $taskId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => 'Updated title',
            'notes' => 'New notes',
            'energy_level' => 'high',
            'time_estimate' => 30,
        ]));

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('Updated title', $response['task']['title']);
        $this->assertEquals('New notes', $response['task']['notes']);
        $this->assertEquals('high', $response['task']['energy_level']);
        $this->assertEquals(30, $response['task']['time_estimate']);
    }

    public function testUpdateTaskInvalidStatus(): void
    {
        $tokens = $this->authenticateUser('update-invalid-status@example.com');
        $taskId = $this->createTask($tokens['access_token'], 'Test task');

        $this->client->request('PATCH', '/api/v1/tasks/' . $taskId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'status' => 'invalid_status',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('INVALID_STATUS', $response['code']);
    }

    public function testDeleteTaskSuccess(): void
    {
        $tokens = $this->authenticateUser('delete-task@example.com');
        $taskId = $this->createTask($tokens['access_token'], 'Task to delete');

        $this->client->request('DELETE', '/api/v1/tasks/' . $taskId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        // Verify task is soft-deleted
        $this->client->request('GET', '/api/v1/tasks/' . $taskId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('deleted', $response['task']['status']);
    }

    // =========================================================================
    // Quick Actions Tests
    // =========================================================================

    public function testCompleteTaskSuccess(): void
    {
        $tokens = $this->authenticateUser('complete-task@example.com');
        $taskId = $this->createTask($tokens['access_token'], 'Task to complete');

        $this->client->request('POST', '/api/v1/tasks/' . $taskId . '/complete', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('completed', $response['task']['status']);
        $this->assertNotNull($response['task']['completed_at']);
    }

    public function testRestoreDeletedTask(): void
    {
        $tokens = $this->authenticateUser('restore-task@example.com');
        $taskId = $this->createTask($tokens['access_token'], 'Task to restore');

        // Delete the task
        $this->client->request('DELETE', '/api/v1/tasks/' . $taskId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        // Restore the task
        $this->client->request('POST', '/api/v1/tasks/' . $taskId . '/restore', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('inbox', $response['task']['status']);
    }

    public function testRestoreNonDeletedTask(): void
    {
        $tokens = $this->authenticateUser('restore-non-deleted@example.com');
        $taskId = $this->createTask($tokens['access_token'], 'Active task');

        $this->client->request('POST', '/api/v1/tasks/' . $taskId . '/restore', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('NOT_DELETED', $response['code']);
    }

    // =========================================================================
    // Task List Tests
    // =========================================================================

    public function testGetAllTasks(): void
    {
        $tokens = $this->authenticateUser('all-tasks@example.com');

        $this->createTask($tokens['access_token'], 'Task 1');
        $taskId2 = $this->createTask($tokens['access_token'], 'Task 2');

        // Complete one task
        $this->client->request('POST', '/api/v1/tasks/' . $taskId2 . '/complete', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->client->request('GET', '/api/v1/tasks', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals(2, $response['count']);
    }

    public function testGetTasksByStatus(): void
    {
        $tokens = $this->authenticateUser('tasks-by-status@example.com');

        $this->createTask($tokens['access_token'], 'Inbox task');
        $taskId = $this->createTask($tokens['access_token'], 'Task to complete');

        // Complete one task
        $this->client->request('POST', '/api/v1/tasks/' . $taskId . '/complete', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        // Get only completed tasks
        $this->client->request('GET', '/api/v1/tasks?status=completed', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals(1, $response['count']);
        $this->assertEquals('completed', $response['tasks'][0]['status']);
    }

    public function testGetTasksInvalidStatus(): void
    {
        $tokens = $this->authenticateUser('invalid-filter@example.com');

        $this->client->request('GET', '/api/v1/tasks?status=invalid', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('INVALID_STATUS', $response['code']);
    }

    // =========================================================================
    // Statistics Tests
    // =========================================================================

    public function testGetTaskStats(): void
    {
        $tokens = $this->authenticateUser('task-stats@example.com');

        // Create various tasks
        $this->createTask($tokens['access_token'], 'Inbox 1');
        $this->createTask($tokens['access_token'], 'Inbox 2');
        $taskId = $this->createTask($tokens['access_token'], 'To complete');

        // Complete one
        $this->client->request('POST', '/api/v1/tasks/' . $taskId . '/complete', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->client->request('GET', '/api/v1/tasks/stats', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('by_status', $response);
        $this->assertArrayHasKey('inbox_count', $response);
        $this->assertArrayHasKey('overdue_count', $response);
        $this->assertArrayHasKey('due_today_count', $response);
        $this->assertEquals(2, $response['inbox_count']);
    }

    // =========================================================================
    // User Isolation Tests
    // =========================================================================

    public function testUserCannotAccessOtherUsersTasks(): void
    {
        // User 1 creates a task
        $tokens1 = $this->authenticateUser('user1-isolation@example.com');
        $taskId = $this->createTask($tokens1['access_token'], 'User 1 task');

        // User 2 tries to access it
        $tokens2 = $this->authenticateUser('user2-isolation@example.com');

        $this->client->request('GET', '/api/v1/tasks/' . $taskId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens2['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    public function testUserInboxIsIsolated(): void
    {
        // User 1 creates tasks
        $tokens1 = $this->authenticateUser('user1-inbox@example.com');
        $this->createTask($tokens1['access_token'], 'User 1 task A');
        $this->createTask($tokens1['access_token'], 'User 1 task B');

        // User 2 creates tasks
        $tokens2 = $this->authenticateUser('user2-inbox@example.com');
        $this->createTask($tokens2['access_token'], 'User 2 task');

        // User 2 should only see their own tasks
        $this->client->request('GET', '/api/v1/tasks/inbox', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens2['access_token'],
        ]);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals(1, $response['count']);
        $this->assertEquals('User 2 task', $response['tasks'][0]['title']);
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private function authenticateUser(string $email = 'test@example.com'): array
    {
        $password = 'Password123!';

        // Register user
        $this->client->request('POST', '/api/v1/auth/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'password' => $password,
        ]));

        // Verify user
        $container = static::getContainer();
        $userRepository = $container->get('App\Repository\UserRepository');
        $user = $userRepository->findByEmail($email);

        if ($user && $user->getVerificationToken()) {
            $this->client->request('POST', '/api/v1/auth/verify-email', [], [], [
                'CONTENT_TYPE' => 'application/json',
            ], json_encode([
                'token' => $user->getVerificationToken(),
            ]));
        }

        // Login
        $this->client->request('POST', '/api/v1/auth/login', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'password' => $password,
        ]));

        return json_decode($this->client->getResponse()->getContent(), true);
    }

    private function createTask(string $accessToken, string $title): string
    {
        $this->client->request('POST', '/api/v1/tasks', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $accessToken,
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => $title,
        ]));

        $response = json_decode($this->client->getResponse()->getContent(), true);

        return $response['task']['id'];
    }
}
