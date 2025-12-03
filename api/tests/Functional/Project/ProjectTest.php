<?php

declare(strict_types=1);

namespace App\Tests\Functional\Project;

use App\Entity\Task;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

/**
 * Functional tests for Project CRUD endpoints (FR-017, FR-018, FR-019)
 */
class ProjectTest extends WebTestCase
{
    private $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    // =========================================================================
    // List Projects Tests
    // =========================================================================

    public function testListProjectsReturnsUserProjects(): void
    {
        $tokens = $this->authenticateUser('list-projects@example.com');

        // Create a project
        $this->createProject($tokens['access_token'], 'Test Project');

        $this->client->request('GET', '/api/v1/projects', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('projects', $response);
        $this->assertArrayHasKey('count', $response);
        $this->assertIsArray($response['projects']);
        $this->assertGreaterThanOrEqual(1, $response['count']);

        $titles = array_column($response['projects'], 'title');
        $this->assertContains('Test Project', $titles);
    }

    public function testListProjectsRequiresAuthentication(): void
    {
        $this->client->request('GET', '/api/v1/projects');

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testListProjectsExcludesOtherUsers(): void
    {
        // User 1 creates a project
        $tokens1 = $this->authenticateUser('list-user1@example.com');
        $this->createProject($tokens1['access_token'], 'User1 Project');

        // User 2 should not see User 1's project
        $tokens2 = $this->authenticateUser('list-user2@example.com');
        $this->createProject($tokens2['access_token'], 'User2 Project');

        $this->client->request('GET', '/api/v1/projects', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens2['access_token'],
        ]);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $titles = array_column($response['projects'], 'title');

        $this->assertContains('User2 Project', $titles);
        $this->assertNotContains('User1 Project', $titles);
    }

    public function testListProjectsFilterByStatus(): void
    {
        $tokens = $this->authenticateUser('list-status@example.com');

        // Create an active project
        $this->createProject($tokens['access_token'], 'Active Project');

        // Create and complete a project
        $projectId = $this->createProject($tokens['access_token'], 'Completed Project');
        $this->client->request('POST', '/api/v1/projects/' . $projectId . '/complete', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        // Filter by active only
        $this->client->request('GET', '/api/v1/projects?status=active', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $titles = array_column($response['projects'], 'title');

        $this->assertContains('Active Project', $titles);
        $this->assertNotContains('Completed Project', $titles);
    }

    public function testListProjectsOrdersByPosition(): void
    {
        $tokens = $this->authenticateUser('list-order@example.com');

        // Create projects (they should be ordered by position automatically)
        $this->createProject($tokens['access_token'], 'First Project');
        $this->createProject($tokens['access_token'], 'Second Project');
        $this->createProject($tokens['access_token'], 'Third Project');

        $this->client->request('GET', '/api/v1/projects', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $titles = array_column($response['projects'], 'title');

        // First created should be first in list
        $this->assertEquals('First Project', $titles[0]);
        $this->assertEquals('Second Project', $titles[1]);
        $this->assertEquals('Third Project', $titles[2]);
    }

    // =========================================================================
    // Get Single Project Tests
    // =========================================================================

    public function testGetProjectById(): void
    {
        $tokens = $this->authenticateUser('get-project@example.com');
        $projectId = $this->createProject($tokens['access_token'], 'Get Project');

        $this->client->request('GET', '/api/v1/projects/' . $projectId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('project', $response);
        $this->assertEquals('Get Project', $response['project']['title']);
        $this->assertEquals('active', $response['project']['status']);
    }

    public function testGetProjectReturnsTasksList(): void
    {
        $tokens = $this->authenticateUser('get-tasks@example.com');
        $projectId = $this->createProject($tokens['access_token'], 'Project With Tasks');

        // Create a task assigned to this project
        $this->createTaskForProject($tokens['access_token'], $projectId, 'Task 1');

        $this->client->request('GET', '/api/v1/projects/' . $projectId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('tasks', $response['project']);
        $this->assertCount(1, $response['project']['tasks']);
        $this->assertEquals('Task 1', $response['project']['tasks'][0]['title']);
    }

    public function testGetProjectReturnsNextAction(): void
    {
        $tokens = $this->authenticateUser('get-nextaction@example.com');
        $projectId = $this->createProject($tokens['access_token'], 'Project With Next Action');

        // Create a next_action task
        $taskId = $this->createTaskForProject($tokens['access_token'], $projectId, 'Next Action Task');
        $this->updateTaskStatus($tokens['access_token'], $taskId, Task::STATUS_NEXT_ACTION);

        $this->client->request('GET', '/api/v1/projects/' . $projectId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('next_action', $response['project']);
        $this->assertEquals('Next Action Task', $response['project']['next_action']['title']);
    }

    public function testGetProjectNotFound(): void
    {
        $tokens = $this->authenticateUser('get-notfound@example.com');

        // Use a valid UUID format that doesn't exist in the database
        $this->client->request('GET', '/api/v1/projects/11111111-1111-4111-8111-111111111111', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('NOT_FOUND', $response['code']);
    }

    public function testCannotGetOtherUserProject(): void
    {
        // User 1 creates a project
        $tokens1 = $this->authenticateUser('get-other1@example.com');
        $projectId = $this->createProject($tokens1['access_token'], 'User1 Secret Project');

        // User 2 tries to get it
        $tokens2 = $this->authenticateUser('get-other2@example.com');

        $this->client->request('GET', '/api/v1/projects/' . $projectId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens2['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    // =========================================================================
    // Create Project Tests (FR-019)
    // =========================================================================

    public function testCreateProject(): void
    {
        $tokens = $this->authenticateUser('create-project@example.com');

        $this->client->request('POST', '/api/v1/projects', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => 'New Project',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('project', $response);
        $this->assertEquals('New Project', $response['project']['title']);
        $this->assertEquals('active', $response['project']['status']);
        $this->assertNotNull($response['project']['id']);
    }

    public function testCreateProjectWithOutcome(): void
    {
        $tokens = $this->authenticateUser('create-outcome@example.com');

        $this->client->request('POST', '/api/v1/projects', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => 'Project With Outcome',
            'outcome' => 'Successfully launch the new feature',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('Successfully launch the new feature', $response['project']['outcome']);
    }

    public function testCreateProjectRequiresTitle(): void
    {
        $tokens = $this->authenticateUser('create-notitle@example.com');

        $this->client->request('POST', '/api/v1/projects', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('MISSING_TITLE', $response['code']);
    }

    public function testCreateProjectRequiresAuthentication(): void
    {
        $this->client->request('POST', '/api/v1/projects', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => 'Test Project',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testCreateProjectSetsDefaultPosition(): void
    {
        $tokens = $this->authenticateUser('create-position@example.com');

        // Create two projects
        $this->createProject($tokens['access_token'], 'First');
        $projectId = $this->createProject($tokens['access_token'], 'Second');

        // Get the second project
        $this->client->request('GET', '/api/v1/projects/' . $projectId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        // Second project should have position 2 (or higher)
        $this->assertGreaterThan(0, $response['project']['position']);
    }

    // =========================================================================
    // Update Project Tests (FR-019)
    // =========================================================================

    public function testUpdateProjectTitle(): void
    {
        $tokens = $this->authenticateUser('update-title@example.com');
        $projectId = $this->createProject($tokens['access_token'], 'Old Title');

        $this->client->request('PATCH', '/api/v1/projects/' . $projectId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => 'New Title',
        ]));

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('New Title', $response['project']['title']);
    }

    public function testUpdateProjectOutcome(): void
    {
        $tokens = $this->authenticateUser('update-outcome@example.com');
        $projectId = $this->createProject($tokens['access_token'], 'Update Outcome');

        $this->client->request('PATCH', '/api/v1/projects/' . $projectId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'outcome' => 'New expected outcome',
        ]));

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('New expected outcome', $response['project']['outcome']);
    }

    public function testUpdateProjectPosition(): void
    {
        $tokens = $this->authenticateUser('update-position@example.com');
        $projectId = $this->createProject($tokens['access_token'], 'Reposition');

        $this->client->request('PATCH', '/api/v1/projects/' . $projectId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'position' => 99,
        ]));

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals(99, $response['project']['position']);
    }

    public function testUpdateProjectReviewDate(): void
    {
        $tokens = $this->authenticateUser('update-review@example.com');
        $projectId = $this->createProject($tokens['access_token'], 'Review Date');

        $this->client->request('PATCH', '/api/v1/projects/' . $projectId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'review_date' => '2025-12-31',
        ]));

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('2025-12-31', $response['project']['review_date']);
    }

    public function testCannotUpdateOtherUserProject(): void
    {
        // User 1 creates a project
        $tokens1 = $this->authenticateUser('update-other1@example.com');
        $projectId = $this->createProject($tokens1['access_token'], 'User1 Project');

        // User 2 tries to update it
        $tokens2 = $this->authenticateUser('update-other2@example.com');

        $this->client->request('PATCH', '/api/v1/projects/' . $projectId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens2['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => 'Hacked',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    // =========================================================================
    // Delete Project Tests
    // =========================================================================

    public function testDeleteProjectSoftDeletes(): void
    {
        $tokens = $this->authenticateUser('delete-project@example.com');
        $projectId = $this->createProject($tokens['access_token'], 'To Delete');

        $this->client->request('DELETE', '/api/v1/projects/' . $projectId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertStringContainsString('deleted', strtolower($response['message']));

        // Verify project is no longer in default (active) list
        $this->client->request('GET', '/api/v1/projects?status=active', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $listResponse = json_decode($this->client->getResponse()->getContent(), true);
        $titles = array_column($listResponse['projects'], 'title');
        $this->assertNotContains('To Delete', $titles);

        // But project still exists with cancelled status
        $this->client->request('GET', '/api/v1/projects?status=cancelled', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $cancelledResponse = json_decode($this->client->getResponse()->getContent(), true);
        $cancelledTitles = array_column($cancelledResponse['projects'], 'title');
        $this->assertContains('To Delete', $cancelledTitles);
    }

    public function testCannotDeleteOtherUserProject(): void
    {
        // User 1 creates a project
        $tokens1 = $this->authenticateUser('delete-other1@example.com');
        $projectId = $this->createProject($tokens1['access_token'], 'User1 Project');

        // User 2 tries to delete it
        $tokens2 = $this->authenticateUser('delete-other2@example.com');

        $this->client->request('DELETE', '/api/v1/projects/' . $projectId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens2['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    // =========================================================================
    // Status Transition Tests
    // =========================================================================

    public function testCompleteProject(): void
    {
        $tokens = $this->authenticateUser('complete-project@example.com');
        $projectId = $this->createProject($tokens['access_token'], 'To Complete');

        $this->client->request('POST', '/api/v1/projects/' . $projectId . '/complete', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('completed', $response['project']['status']);
        $this->assertNotNull($response['project']['completed_at']);
    }

    public function testPutProjectOnHold(): void
    {
        $tokens = $this->authenticateUser('hold-project@example.com');
        $projectId = $this->createProject($tokens['access_token'], 'To Hold');

        $this->client->request('POST', '/api/v1/projects/' . $projectId . '/hold', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('on_hold', $response['project']['status']);
    }

    public function testActivateProjectFromHold(): void
    {
        $tokens = $this->authenticateUser('activate-project@example.com');
        $projectId = $this->createProject($tokens['access_token'], 'To Activate');

        // Put on hold first
        $this->client->request('POST', '/api/v1/projects/' . $projectId . '/hold', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        // Now activate
        $this->client->request('POST', '/api/v1/projects/' . $projectId . '/activate', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('active', $response['project']['status']);
    }

    public function testCompletingAlreadyCompletedProjectIsIdempotent(): void
    {
        $tokens = $this->authenticateUser('complete-twice@example.com');
        $projectId = $this->createProject($tokens['access_token'], 'Complete Twice');

        // Complete once
        $this->client->request('POST', '/api/v1/projects/' . $projectId . '/complete', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        // Complete again - should be idempotent (same status transition is allowed)
        $this->client->request('POST', '/api/v1/projects/' . $projectId . '/complete', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        // Should still succeed (no-op but returns 200)
        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('completed', $response['project']['status']);
    }

    public function testCannotPutCompletedProjectOnHold(): void
    {
        $tokens = $this->authenticateUser('complete-hold@example.com');
        $projectId = $this->createProject($tokens['access_token'], 'Complete Then Hold');

        // Complete the project
        $this->client->request('POST', '/api/v1/projects/' . $projectId . '/complete', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        // Try to put on hold - should fail
        $this->client->request('POST', '/api/v1/projects/' . $projectId . '/hold', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('INVALID_TRANSITION', $response['code']);
    }

    // =========================================================================
    // GTD-Specific Tests (FR-017, FR-018)
    // =========================================================================

    public function testGetProjectsNeedingAttention(): void
    {
        // Use unique email to avoid leftover data from previous test runs
        $uniqueId = uniqid();
        $tokens = $this->authenticateUser("attention-{$uniqueId}@example.com");

        $needsAttentionTitle = "Needs Attention {$uniqueId}";
        $hasNextActionTitle = "Has Next Action {$uniqueId}";

        // Create project without next action
        $this->createProject($tokens['access_token'], $needsAttentionTitle);

        // Create project with next action
        $projectWithAction = $this->createProject($tokens['access_token'], $hasNextActionTitle);
        $taskId = $this->createTaskForProject($tokens['access_token'], $projectWithAction, 'NA Task');
        $this->updateTaskStatus($tokens['access_token'], $taskId, Task::STATUS_NEXT_ACTION);

        $this->client->request('GET', '/api/v1/projects/needing-attention', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $titles = array_column($response['projects'], 'title');

        $this->assertContains($needsAttentionTitle, $titles);
        $this->assertNotContains($hasNextActionTitle, $titles);
    }

    public function testGetProjectsDueForReview(): void
    {
        $tokens = $this->authenticateUser('review-due@example.com');

        // Create project due for review (past date)
        $projectId = $this->createProject($tokens['access_token'], 'Due For Review');
        $this->client->request('PATCH', '/api/v1/projects/' . $projectId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'review_date' => (new \DateTimeImmutable('-1 day'))->format('Y-m-d'),
        ]));

        // Create project with future review date
        $futureProjectId = $this->createProject($tokens['access_token'], 'Future Review');
        $this->client->request('PATCH', '/api/v1/projects/' . $futureProjectId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'review_date' => (new \DateTimeImmutable('+7 days'))->format('Y-m-d'),
        ]));

        $this->client->request('GET', '/api/v1/projects/due-for-review', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $titles = array_column($response['projects'], 'title');

        $this->assertContains('Due For Review', $titles);
        $this->assertNotContains('Future Review', $titles);
    }

    public function testProjectWithNextActionNotInNeedingAttention(): void
    {
        // Use unique email to avoid leftover data from previous test runs
        $uniqueId = uniqid();
        $tokens = $this->authenticateUser("not-needing-{$uniqueId}@example.com");

        $projectWithAction = "Has Action {$uniqueId}";
        $projectId = $this->createProject($tokens['access_token'], $projectWithAction);

        // Add a next action
        $taskId = $this->createTaskForProject($tokens['access_token'], $projectId, 'The Next Action');
        $this->updateTaskStatus($tokens['access_token'], $taskId, Task::STATUS_NEXT_ACTION);

        $this->client->request('GET', '/api/v1/projects/needing-attention', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $titles = array_column($response['projects'], 'title');

        $this->assertNotContains($projectWithAction, $titles);
    }

    // =========================================================================
    // Additional Tests
    // =========================================================================

    public function testUpdateProjectRequiresAuthentication(): void
    {
        $this->client->request('PATCH', '/api/v1/projects/00000000-0000-0000-0000-000000000001', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => 'Test',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testDeleteProjectRequiresAuthentication(): void
    {
        $this->client->request('DELETE', '/api/v1/projects/00000000-0000-0000-0000-000000000001');

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testGetProjectRequiresAuthentication(): void
    {
        $this->client->request('GET', '/api/v1/projects/00000000-0000-0000-0000-000000000001');

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testInvalidUuidReturnsError(): void
    {
        $tokens = $this->authenticateUser('invalid-uuid@example.com');

        // Invalid UUID format - doesn't match the route pattern, so returns 404
        $this->client->request('GET', '/api/v1/projects/invalid-uuid', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    public function testProjectListIncludesHasNextActionFlag(): void
    {
        // Use unique email to avoid leftover data from previous test runs
        $uniqueId = uniqid();
        $tokens = $this->authenticateUser("list-hasnextaction-{$uniqueId}@example.com");

        $withNATitle = "With NA {$uniqueId}";
        $withoutNATitle = "Without NA {$uniqueId}";

        // Create project with next action
        $projectId = $this->createProject($tokens['access_token'], $withNATitle);
        $taskId = $this->createTaskForProject($tokens['access_token'], $projectId, 'Next');
        $this->updateTaskStatus($tokens['access_token'], $taskId, Task::STATUS_NEXT_ACTION);

        // Create project without
        $this->createProject($tokens['access_token'], $withoutNATitle);

        $this->client->request('GET', '/api/v1/projects', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        foreach ($response['projects'] as $project) {
            $this->assertArrayHasKey('has_next_action', $project);
            if ($project['title'] === $withNATitle) {
                $this->assertTrue($project['has_next_action']);
            }
            if ($project['title'] === $withoutNATitle) {
                $this->assertFalse($project['has_next_action']);
            }
        }
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

    private function createProject(string $accessToken, string $title): string
    {
        $this->client->request('POST', '/api/v1/projects', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $accessToken,
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => $title,
        ]));

        $response = json_decode($this->client->getResponse()->getContent(), true);

        if (!isset($response['project']['id'])) {
            throw new \RuntimeException(sprintf(
                'Failed to create project "%s": %s',
                $title,
                json_encode($response)
            ));
        }

        return $response['project']['id'];
    }

    private function createTaskForProject(string $accessToken, string $projectId, string $title): string
    {
        // Create task first
        $this->client->request('POST', '/api/v1/tasks', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $accessToken,
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => $title,
        ]));

        $response = json_decode($this->client->getResponse()->getContent(), true);

        if (!isset($response['task']['id'])) {
            throw new \RuntimeException(sprintf(
                'Failed to create task "%s": %s',
                $title,
                json_encode($response)
            ));
        }

        $taskId = $response['task']['id'];

        // Assign to project
        $this->client->request('PATCH', '/api/v1/tasks/' . $taskId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $accessToken,
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'project_id' => $projectId,
        ]));

        return $taskId;
    }

    private function updateTaskStatus(string $accessToken, string $taskId, string $status): void
    {
        $this->client->request('PATCH', '/api/v1/tasks/' . $taskId . '/clarify', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $accessToken,
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'target_status' => $status,
        ]));
    }
}
