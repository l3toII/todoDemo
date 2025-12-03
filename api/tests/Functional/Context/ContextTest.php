<?php

declare(strict_types=1);

namespace App\Tests\Functional\Context;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

/**
 * Functional tests for Context CRUD endpoints (FR-013, FR-014, FR-015)
 */
class ContextTest extends WebTestCase
{
    private $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();

        // Seed default contexts if they don't exist
        $this->seedDefaultContexts();
    }

    private function seedDefaultContexts(): void
    {
        $container = static::getContainer();
        $contextRepository = $container->get('App\Repository\ContextRepository');

        $existingDefaults = $contextRepository->findDefaults();
        if (count($existingDefaults) >= 6) {
            return; // Already seeded
        }

        $defaultContexts = [
            ['name' => '@Office', 'icon' => 'briefcase', 'color' => '#3498db'],
            ['name' => '@Home', 'icon' => 'home', 'color' => '#27ae60'],
            ['name' => '@Phone', 'icon' => 'phone', 'color' => '#9b59b6'],
            ['name' => '@Errands', 'icon' => 'shopping-cart', 'color' => '#e74c3c'],
            ['name' => '@Computer', 'icon' => 'laptop', 'color' => '#f39c12'],
            ['name' => '@Waiting', 'icon' => 'clock', 'color' => '#95a5a6'],
        ];

        $existingNames = array_map(fn($c) => $c->getName(), $existingDefaults);

        foreach ($defaultContexts as $position => $data) {
            if (in_array($data['name'], $existingNames, true)) {
                continue;
            }

            $context = \App\Entity\Context::createDefault(
                $data['name'],
                $data['icon'],
                $data['color']
            );
            $context->setPosition($position);
            $contextRepository->save($context, false);
        }

        // Flush all at once
        $em = $container->get('doctrine.orm.entity_manager');
        $em->flush();
    }

    // =========================================================================
    // List Contexts Tests (FR-013, FR-015)
    // =========================================================================

    public function testListContextsReturnsDefaultsAndCustom(): void
    {
        $tokens = $this->authenticateUser('list-contexts@example.com');

        // Create a custom context
        $this->createContext($tokens['access_token'], '@MyCustom');

        $this->client->request('GET', '/api/v1/contexts', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('contexts', $response);
        $this->assertArrayHasKey('count', $response);
        $this->assertIsArray($response['contexts']);

        // Should have defaults + our custom context
        $names = array_column($response['contexts'], 'name');
        $this->assertContains('@Office', $names);
        $this->assertContains('@Home', $names);
        $this->assertContains('@MyCustom', $names);
    }

    public function testListContextsRequiresAuthentication(): void
    {
        $this->client->request('GET', '/api/v1/contexts');

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testListContextsOnlyShowsActiveContexts(): void
    {
        $tokens = $this->authenticateUser('list-active@example.com');

        // Create and archive a context
        $contextId = $this->createContext($tokens['access_token'], '@ToArchive');
        $this->client->request('DELETE', '/api/v1/contexts/' . $contextId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        // List should not include archived
        $this->client->request('GET', '/api/v1/contexts', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $names = array_column($response['contexts'], 'name');

        $this->assertNotContains('@ToArchive', $names);
    }

    public function testListDefaultContextsOnly(): void
    {
        $tokens = $this->authenticateUser('list-defaults@example.com');

        // Create a custom context
        $this->createContext($tokens['access_token'], '@Custom');

        $this->client->request('GET', '/api/v1/contexts/defaults', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        // Should only have defaults, no custom
        foreach ($response['contexts'] as $context) {
            $this->assertTrue($context['is_default']);
        }
    }

    // =========================================================================
    // Get Single Context Tests
    // =========================================================================

    public function testGetContextById(): void
    {
        $tokens = $this->authenticateUser('get-context@example.com');
        $contextId = $this->createContext($tokens['access_token'], '@TestGet');

        $this->client->request('GET', '/api/v1/contexts/' . $contextId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('context', $response);
        $this->assertEquals($contextId, $response['context']['id']);
        $this->assertEquals('@TestGet', $response['context']['name']);
    }

    public function testGetContextNotFoundReturns404(): void
    {
        $tokens = $this->authenticateUser('get-notfound@example.com');

        $this->client->request('GET', '/api/v1/contexts/00000000-0000-0000-0000-000000000000', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    public function testCannotGetOtherUserContext(): void
    {
        // User 1 creates a context
        $tokens1 = $this->authenticateUser('user1-context@example.com');
        $contextId = $this->createContext($tokens1['access_token'], '@User1Context');

        // User 2 tries to access it
        $tokens2 = $this->authenticateUser('user2-context@example.com');

        $this->client->request('GET', '/api/v1/contexts/' . $contextId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens2['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    public function testCanGetDefaultContext(): void
    {
        $tokens = $this->authenticateUser('get-default@example.com');

        // Get list to find a default context ID
        $this->client->request('GET', '/api/v1/contexts/defaults', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $defaultId = $response['contexts'][0]['id'];

        // Should be able to get it
        $this->client->request('GET', '/api/v1/contexts/' . $defaultId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();
    }

    // =========================================================================
    // Create Context Tests (FR-014)
    // =========================================================================

    public function testCreateContextWithValidData(): void
    {
        $tokens = $this->authenticateUser('create-context@example.com');

        $this->client->request('POST', '/api/v1/contexts', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'name' => '@NewContext',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('message', $response);
        $this->assertArrayHasKey('context', $response);
        $this->assertEquals('@NewContext', $response['context']['name']);
        $this->assertFalse($response['context']['is_default']);
        $this->assertEquals('active', $response['context']['status']);
    }

    public function testCreateContextRequiresName(): void
    {
        $tokens = $this->authenticateUser('create-no-name@example.com');

        $this->client->request('POST', '/api/v1/contexts', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('MISSING_NAME', $response['code']);
    }

    public function testCreateContextNameMustStartWithAt(): void
    {
        $tokens = $this->authenticateUser('create-no-at@example.com');

        $this->client->request('POST', '/api/v1/contexts', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'name' => 'NoAtSymbol',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('VALIDATION_ERROR', $response['code']);
    }

    public function testCreateContextDuplicateNameFails(): void
    {
        $tokens = $this->authenticateUser('create-dup@example.com');

        // Create first context
        $this->createContext($tokens['access_token'], '@Duplicate');

        // Try to create another with same name
        $this->client->request('POST', '/api/v1/contexts', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'name' => '@Duplicate',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_CONFLICT);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('DUPLICATE_NAME', $response['code']);
    }

    public function testCreateContextCannotUseSameNameAsDefault(): void
    {
        $tokens = $this->authenticateUser('create-default-name@example.com');

        $this->client->request('POST', '/api/v1/contexts', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'name' => '@Office',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_CONFLICT);
    }

    public function testCreateContextWithOptionalFields(): void
    {
        $tokens = $this->authenticateUser('create-opts@example.com');

        $this->client->request('POST', '/api/v1/contexts', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'name' => '@WithOptions',
            'icon' => 'star',
            'color' => '#FF5733',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertEquals('@WithOptions', $response['context']['name']);
        $this->assertEquals('star', $response['context']['icon']);
        $this->assertEquals('#FF5733', $response['context']['color']);
    }

    public function testCreateContextWithInvalidColor(): void
    {
        $tokens = $this->authenticateUser('create-bad-color@example.com');

        $this->client->request('POST', '/api/v1/contexts', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'name' => '@BadColor',
            'color' => 'not-a-color',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('VALIDATION_ERROR', $response['code']);
    }

    public function testCreateContextRequiresAuthentication(): void
    {
        $this->client->request('POST', '/api/v1/contexts', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'name' => '@Test',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    // =========================================================================
    // Update Context Tests
    // =========================================================================

    public function testUpdateContextName(): void
    {
        $tokens = $this->authenticateUser('update-name@example.com');
        $contextId = $this->createContext($tokens['access_token'], '@OldName');

        $this->client->request('PATCH', '/api/v1/contexts/' . $contextId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'name' => '@NewName',
        ]));

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('@NewName', $response['context']['name']);
    }

    public function testUpdateContextIcon(): void
    {
        $tokens = $this->authenticateUser('update-icon@example.com');
        $contextId = $this->createContext($tokens['access_token'], '@UpdateIcon');

        $this->client->request('PATCH', '/api/v1/contexts/' . $contextId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'icon' => 'home',
        ]));

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('home', $response['context']['icon']);
    }

    public function testUpdateContextColor(): void
    {
        $tokens = $this->authenticateUser('update-color@example.com');
        $contextId = $this->createContext($tokens['access_token'], '@UpdateColor');

        $this->client->request('PATCH', '/api/v1/contexts/' . $contextId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'color' => '#00FF00',
        ]));

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('#00FF00', $response['context']['color']);
    }

    public function testCannotUpdateDefaultContext(): void
    {
        $tokens = $this->authenticateUser('update-default@example.com');

        // Get a default context ID
        $this->client->request('GET', '/api/v1/contexts/defaults', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $defaultId = $response['contexts'][0]['id'];

        // Try to update it
        $this->client->request('PATCH', '/api/v1/contexts/' . $defaultId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'name' => '@Modified',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('CANNOT_MODIFY_DEFAULT', $response['code']);
    }

    public function testCannotUpdateOtherUserContext(): void
    {
        // User 1 creates a context
        $tokens1 = $this->authenticateUser('update-user1@example.com');
        $contextId = $this->createContext($tokens1['access_token'], '@User1Ctx');

        // User 2 tries to update it
        $tokens2 = $this->authenticateUser('update-user2@example.com');

        $this->client->request('PATCH', '/api/v1/contexts/' . $contextId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens2['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'name' => '@Hacked',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    public function testUpdateContextToExistingNameFails(): void
    {
        $tokens = $this->authenticateUser('update-dup@example.com');

        $this->createContext($tokens['access_token'], '@First');
        $secondId = $this->createContext($tokens['access_token'], '@Second');

        // Try to rename Second to First
        $this->client->request('PATCH', '/api/v1/contexts/' . $secondId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'name' => '@First',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_CONFLICT);
    }

    // =========================================================================
    // Delete (Archive) Context Tests
    // =========================================================================

    public function testDeleteContextArchivesIt(): void
    {
        $tokens = $this->authenticateUser('delete-ctx@example.com');
        $contextId = $this->createContext($tokens['access_token'], '@ToDelete');

        $this->client->request('DELETE', '/api/v1/contexts/' . $contextId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Context archived successfully', $response['message']);

        // Verify it's archived (still exists but with archived status)
        $this->client->request('GET', '/api/v1/contexts/' . $contextId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $getResponse = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('archived', $getResponse['context']['status']);
    }

    public function testCannotDeleteDefaultContext(): void
    {
        $tokens = $this->authenticateUser('delete-default@example.com');

        // Get a default context ID
        $this->client->request('GET', '/api/v1/contexts/defaults', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $defaultId = $response['contexts'][0]['id'];

        // Try to delete it
        $this->client->request('DELETE', '/api/v1/contexts/' . $defaultId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('CANNOT_DELETE_DEFAULT', $response['code']);
    }

    public function testCannotDeleteOtherUserContext(): void
    {
        // User 1 creates a context
        $tokens1 = $this->authenticateUser('del-user1@example.com');
        $contextId = $this->createContext($tokens1['access_token'], '@User1Del');

        // User 2 tries to delete it
        $tokens2 = $this->authenticateUser('del-user2@example.com');

        $this->client->request('DELETE', '/api/v1/contexts/' . $contextId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens2['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    // =========================================================================
    // Restore Context Tests
    // =========================================================================

    public function testRestoreArchivedContext(): void
    {
        $tokens = $this->authenticateUser('restore-ctx@example.com');
        $contextId = $this->createContext($tokens['access_token'], '@ToRestore');

        // Archive it
        $this->client->request('DELETE', '/api/v1/contexts/' . $contextId, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        // Restore it
        $this->client->request('POST', '/api/v1/contexts/' . $contextId . '/restore', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('active', $response['context']['status']);
    }

    public function testRestoreNonArchivedContextFails(): void
    {
        $tokens = $this->authenticateUser('restore-active@example.com');
        $contextId = $this->createContext($tokens['access_token'], '@Active');

        // Try to restore an active context
        $this->client->request('POST', '/api/v1/contexts/' . $contextId . '/restore', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('NOT_ARCHIVED', $response['code']);
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

    private function createContext(string $accessToken, string $name): string
    {
        $this->client->request('POST', '/api/v1/contexts', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $accessToken,
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'name' => $name,
        ]));

        $response = json_decode($this->client->getResponse()->getContent(), true);

        if (!isset($response['context']['id'])) {
            throw new \RuntimeException(sprintf(
                'Failed to create context "%s": %s',
                $name,
                json_encode($response)
            ));
        }

        return $response['context']['id'];
    }
}
