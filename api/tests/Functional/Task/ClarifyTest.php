<?php

declare(strict_types=1);

namespace App\Tests\Functional\Task;

use App\Entity\Task;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

/**
 * Functional tests for Task clarification endpoint (FR-010, FR-011, FR-012)
 */
class ClarifyTest extends WebTestCase
{
    private $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    // =========================================================================
    // Clarify Endpoint - Success Cases
    // =========================================================================

    public function testClarifyTaskToNextAction(): void
    {
        $tokens = $this->authenticateUser();
        $task = $this->createInboxTask($tokens['access_token'], 'Task to clarify');

        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'next_action',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_OK);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('Task clarified successfully', $response['message']);
        $this->assertEquals('next_action', $response['task']['status']);
        $this->assertArrayHasKey('transition', $response);
    }

    public function testClarifyTaskToNextActionWithMetadata(): void
    {
        $tokens = $this->authenticateUser();
        $task = $this->createInboxTask($tokens['access_token'], 'Complex task');

        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'next_action',
            'energy_level' => 'high',
            'time_estimate' => 45,
            'due_date' => '2025-12-31',
            'notes' => 'Important task notes',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_OK);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('next_action', $response['task']['status']);
        $this->assertEquals('high', $response['task']['energy_level']);
        $this->assertEquals(45, $response['task']['time_estimate']);
        $this->assertEquals('2025-12-31', $response['task']['due_date']);
        $this->assertEquals('Important task notes', $response['task']['notes']);
    }

    public function testClarifyTaskToWaitingFor(): void
    {
        $tokens = $this->authenticateUser();
        $task = $this->createInboxTask($tokens['access_token'], 'Delegated task');

        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'waiting_for',
            'notes' => 'Waiting for: John to respond',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_OK);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('waiting_for', $response['task']['status']);
        $this->assertStringContainsString('Waiting for', $response['task']['notes']);
    }

    public function testClarifyTaskToSomedayMaybe(): void
    {
        $tokens = $this->authenticateUser();
        $task = $this->createInboxTask($tokens['access_token'], 'Deferred task');

        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'someday_maybe',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_OK);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('someday_maybe', $response['task']['status']);
    }

    public function testClarifyTaskToReference(): void
    {
        $tokens = $this->authenticateUser();
        $task = $this->createInboxTask($tokens['access_token'], 'Reference material');

        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'reference',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_OK);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('reference', $response['task']['status']);
    }

    public function testClarifyTaskToCompleted(): void
    {
        $tokens = $this->authenticateUser();
        $task = $this->createInboxTask($tokens['access_token'], 'Quick 2-minute task');

        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'completed',
            'time_estimate' => 2,
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_OK);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('completed', $response['task']['status']);
        $this->assertEquals(2, $response['task']['time_estimate']);
        $this->assertNotNull($response['task']['completed_at']);
    }

    public function testClarifyTaskToDeleted(): void
    {
        $tokens = $this->authenticateUser();
        $task = $this->createInboxTask($tokens['access_token'], 'Trash this');

        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'deleted',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_OK);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('deleted', $response['task']['status']);
    }

    // =========================================================================
    // Clarify Endpoint - Error Cases
    // =========================================================================

    public function testClarifyTaskMissingTargetStatus(): void
    {
        $tokens = $this->authenticateUser();
        $task = $this->createInboxTask($tokens['access_token'], 'Test task');

        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'energy_level' => 'high',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('MISSING_TARGET_STATUS', $response['code']);
    }

    public function testClarifyTaskInvalidTargetStatus(): void
    {
        $tokens = $this->authenticateUser();
        $task = $this->createInboxTask($tokens['access_token'], 'Test task');

        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'invalid_status',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('INVALID_TARGET_STATUS', $response['code']);
        $this->assertArrayHasKey('allowed_values', $response);
    }

    public function testClarifyTaskInvalidTransition(): void
    {
        $tokens = $this->authenticateUser();
        $task = $this->createInboxTask($tokens['access_token'], 'Test task');

        // First move to reference
        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'reference',
        ]));

        // Now try invalid transition from reference to next_action
        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'next_action',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('INVALID_TRANSITION', $response['code']);
        $this->assertEquals('reference', $response['current_status']);
        $this->assertEquals('next_action', $response['target_status']);
        $this->assertArrayHasKey('allowed_transitions', $response);
    }

    public function testClarifyTaskInvalidEnergyLevel(): void
    {
        $tokens = $this->authenticateUser();
        $task = $this->createInboxTask($tokens['access_token'], 'Test task');

        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'next_action',
            'energy_level' => 'super_high',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('INVALID_ENERGY_LEVEL', $response['code']);
    }

    public function testClarifyTaskInvalidTimeEstimate(): void
    {
        $tokens = $this->authenticateUser();
        $task = $this->createInboxTask($tokens['access_token'], 'Test task');

        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'next_action',
            'time_estimate' => -10,
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('INVALID_TIME_ESTIMATE', $response['code']);
    }

    public function testClarifyTaskInvalidDueDate(): void
    {
        $tokens = $this->authenticateUser();
        $task = $this->createInboxTask($tokens['access_token'], 'Test task');

        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'next_action',
            'due_date' => 'not-a-date',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('INVALID_DUE_DATE', $response['code']);
    }

    public function testClarifyTaskNotFound(): void
    {
        $tokens = $this->authenticateUser();

        $this->client->request('PATCH', '/api/v1/tasks/00000000-0000-0000-0000-000000000000/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'next_action',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    public function testClarifyTaskUnauthenticated(): void
    {
        $this->client->request('PATCH', '/api/v1/tasks/00000000-0000-0000-0000-000000000000/clarify', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'next_action',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testClarifyOtherUsersTask(): void
    {
        $tokens1 = $this->authenticateUser('user1@example.com');
        $tokens2 = $this->authenticateUser('user2@example.com');

        $task = $this->createInboxTask($tokens1['access_token'], 'User 1 task');

        // Try to clarify user1's task with user2's token
        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens2['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'next_action',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    // =========================================================================
    // Transitions Endpoint Tests
    // =========================================================================

    public function testGetTransitionsForInboxTask(): void
    {
        $tokens = $this->authenticateUser();
        $task = $this->createInboxTask($tokens['access_token'], 'Inbox task');

        $this->client->request('GET', '/api/v1/tasks/' . $task['id'] . '/transitions', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_OK);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals($task['id'], $response['task_id']);
        $this->assertEquals('inbox', $response['current_status']);
        $this->assertContains('next_action', $response['allowed_transitions']);
        $this->assertContains('waiting_for', $response['allowed_transitions']);
        $this->assertContains('someday_maybe', $response['allowed_transitions']);
        $this->assertContains('reference', $response['allowed_transitions']);
        $this->assertContains('completed', $response['allowed_transitions']);
        $this->assertContains('deleted', $response['allowed_transitions']);
    }

    public function testGetTransitionsForReferenceTask(): void
    {
        $tokens = $this->authenticateUser();
        $task = $this->createInboxTask($tokens['access_token'], 'Reference task');

        // Move to reference first
        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'reference',
        ]));

        $this->client->request('GET', '/api/v1/tasks/' . $task['id'] . '/transitions', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_OK);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('reference', $response['current_status']);
        // Reference can only go to someday_maybe, deleted, or inbox
        $this->assertContains('someday_maybe', $response['allowed_transitions']);
        $this->assertContains('deleted', $response['allowed_transitions']);
        $this->assertContains('inbox', $response['allowed_transitions']);
        $this->assertNotContains('next_action', $response['allowed_transitions']);
    }

    // =========================================================================
    // GTD Workflow Tests
    // =========================================================================

    public function testCompleteGtdWorkflow(): void
    {
        $tokens = $this->authenticateUser();

        // Step 1: Capture task in inbox
        $task = $this->createInboxTask($tokens['access_token'], 'Write quarterly report');

        $this->assertEquals('inbox', $task['status']);

        // Step 2: Clarify - Is it actionable? Yes! -> next_action
        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'next_action',
            'energy_level' => 'high',
            'time_estimate' => 120,
        ]));

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('next_action', $response['task']['status']);

        // Step 3: Actually, need to delegate it -> waiting_for
        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'waiting_for',
            'notes' => 'Waiting for: Finance team to provide numbers',
        ]));

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('waiting_for', $response['task']['status']);

        // Step 4: Got the info, back to next_action
        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'next_action',
        ]));

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('next_action', $response['task']['status']);

        // Step 5: Complete the task
        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'completed',
        ]));

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('completed', $response['task']['status']);
        $this->assertNotNull($response['task']['completed_at']);
    }

    public function testSomedayMaybeReactivation(): void
    {
        $tokens = $this->authenticateUser();

        // Create and defer task
        $task = $this->createInboxTask($tokens['access_token'], 'Learn piano');

        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'someday_maybe',
        ]));

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('someday_maybe', $response['task']['status']);

        // During weekly review, decide to activate it
        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'next_action',
            'time_estimate' => 60,
        ]));

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('next_action', $response['task']['status']);
    }

    public function testRestoreDeletedTask(): void
    {
        $tokens = $this->authenticateUser();

        $task = $this->createInboxTask($tokens['access_token'], 'Accidentally deleted');

        // Delete it
        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'deleted',
        ]));

        // Restore to inbox
        $this->client->request('PATCH', '/api/v1/tasks/' . $task['id'] . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => 'inbox',
        ]));

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('inbox', $response['task']['status']);
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

    private function createInboxTask(string $accessToken, string $title): array
    {
        $this->client->request('POST', '/api/v1/tasks', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $accessToken,
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => $title,
        ]));

        $response = json_decode($this->client->getResponse()->getContent(), true);

        return $response['task'];
    }
}
