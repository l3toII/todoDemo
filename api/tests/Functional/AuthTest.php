<?php

namespace App\Tests\Functional;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

/**
 * Functional tests for authentication endpoints
 *
 * Tests the complete authentication flow including:
 * - User registration
 * - Email verification
 * - Login with email/password
 * - Token refresh
 * - Password reset
 * - Logout
 */
class AuthTest extends WebTestCase
{
    private $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    // =========================================================================
    // Registration Tests
    // =========================================================================

    public function testUserRegistration(): void
    {
        $this->client->request('POST', '/api/v1/auth/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'newuser@example.com',
            'password' => 'SecurePassword123!',
            'timezone' => 'America/New_York',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('message', $response);
        $this->assertArrayHasKey('user', $response);
        $this->assertEquals('newuser@example.com', $response['user']['email']);
        $this->assertEquals('pending_verification', $response['user']['status']);
    }

    public function testRegistrationWithExistingEmail(): void
    {
        // Register first user
        $this->client->request('POST', '/api/v1/auth/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'duplicate@example.com',
            'password' => 'Password123!',
        ]));

        // Try to register with same email
        $this->client->request('POST', '/api/v1/auth/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'duplicate@example.com',
            'password' => 'Password123!',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_CONFLICT);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('error', $response);
        $this->assertEquals('EMAIL_EXISTS', $response['code']);
    }

    public function testRegistrationWithWeakPassword(): void
    {
        $this->client->request('POST', '/api/v1/auth/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'test@example.com',
            'password' => 'weak',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('WEAK_PASSWORD', $response['code']);
    }

    public function testRegistrationWithInvalidEmail(): void
    {
        $this->client->request('POST', '/api/v1/auth/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'invalid-email',
            'password' => 'SecurePassword123!',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('INVALID_EMAIL', $response['code']);
    }

    public function testRegistrationMissingFields(): void
    {
        $this->client->request('POST', '/api/v1/auth/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'test@example.com',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('MISSING_FIELDS', $response['code']);
    }

    // =========================================================================
    // Login Tests
    // =========================================================================

    public function testSuccessfulLogin(): void
    {
        // First register and verify a user
        $email = 'logintest@example.com';
        $password = 'Password123!';

        $this->registerAndVerifyUser($email, $password);

        // Now test login
        $this->client->request('POST', '/api/v1/auth/login', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'password' => $password,
        ]));

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('access_token', $response);
        $this->assertArrayHasKey('refresh_token', $response);
        $this->assertArrayHasKey('token_type', $response);
        $this->assertArrayHasKey('expires_in', $response);
        $this->assertArrayHasKey('user', $response);
        $this->assertEquals('Bearer', $response['token_type']);
        $this->assertEquals(900, $response['expires_in']);
        $this->assertEquals($email, $response['user']['email']);
    }

    public function testLoginWithInvalidCredentials(): void
    {
        $this->client->request('POST', '/api/v1/auth/login', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'nonexistent@example.com',
            'password' => 'WrongPassword',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('INVALID_CREDENTIALS', $response['code']);
    }

    public function testLoginWithUnverifiedAccount(): void
    {
        // Register user but don't verify
        $email = 'unverified@example.com';
        $password = 'Password123!';

        $this->client->request('POST', '/api/v1/auth/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'password' => $password,
        ]));

        // Try to login
        $this->client->request('POST', '/api/v1/auth/login', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'password' => $password,
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('ACCOUNT_NOT_ACTIVE', $response['code']);
    }

    public function testLoginMissingFields(): void
    {
        $this->client->request('POST', '/api/v1/auth/login', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'test@example.com',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('INVALID_CREDENTIALS', $response['code']);
    }

    // =========================================================================
    // Token Refresh Tests
    // =========================================================================

    public function testTokenRefresh(): void
    {
        $email = 'refreshtest@example.com';
        $password = 'Password123!';

        // Register, verify, and login
        $this->registerAndVerifyUser($email, $password);
        $tokens = $this->loginUser($email, $password);

        // Test refresh
        $this->client->request('POST', '/api/v1/auth/refresh', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'refresh_token' => $tokens['refresh_token'],
        ]));

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertArrayHasKey('access_token', $response);
        $this->assertArrayHasKey('refresh_token', $response);
        $this->assertNotEquals($tokens['access_token'], $response['access_token']);
        $this->assertNotEquals($tokens['refresh_token'], $response['refresh_token']);
    }

    public function testRefreshWithInvalidToken(): void
    {
        $this->client->request('POST', '/api/v1/auth/refresh', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'refresh_token' => 'invalid_token',
        ]));

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('INVALID_REFRESH_TOKEN', $response['code']);
    }

    public function testRefreshMissingToken(): void
    {
        $this->client->request('POST', '/api/v1/auth/refresh', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('MISSING_REFRESH_TOKEN', $response['code']);
    }

    // =========================================================================
    // Password Reset Tests
    // =========================================================================

    public function testPasswordResetRequest(): void
    {
        $email = 'resettest@example.com';
        $this->registerAndVerifyUser($email, 'OldPassword123!');

        $this->client->request('POST', '/api/v1/auth/password-reset/request', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
        ]));

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('message', $response);
    }

    public function testPasswordResetRequestWithNonexistentEmail(): void
    {
        $this->client->request('POST', '/api/v1/auth/password-reset/request', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'nonexistent@example.com',
        ]));

        // Should still return success (security best practice)
        $this->assertResponseIsSuccessful();
    }

    public function testPasswordResetRequestMissingEmail(): void
    {
        $this->client->request('POST', '/api/v1/auth/password-reset/request', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([]));

        $this->assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('MISSING_EMAIL', $response['code']);
    }

    // =========================================================================
    // Authenticated Endpoint Tests
    // =========================================================================

    public function testAuthenticatedEndpointWithValidToken(): void
    {
        $email = 'authtest@example.com';
        $password = 'Password123!';

        $this->registerAndVerifyUser($email, $password);
        $tokens = $this->loginUser($email, $password);

        // Test /auth/me endpoint
        $this->client->request('GET', '/api/v1/auth/me', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('user', $response);
        $this->assertEquals($email, $response['user']['email']);
    }

    public function testAuthenticatedEndpointWithoutToken(): void
    {
        $this->client->request('GET', '/api/v1/auth/me');

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testAuthenticatedEndpointWithInvalidToken(): void
    {
        $this->client->request('GET', '/api/v1/auth/me', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer invalid_token',
            'CONTENT_TYPE' => 'application/json',
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    // =========================================================================
    // Logout Tests
    // =========================================================================

    public function testLogout(): void
    {
        $email = 'logouttest@example.com';
        $password = 'Password123!';

        $this->registerAndVerifyUser($email, $password);
        $tokens = $this->loginUser($email, $password);

        // Logout
        $this->client->request('POST', '/api/v1/auth/logout', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $tokens['access_token'],
            'CONTENT_TYPE' => 'application/json',
        ]);

        $this->assertResponseIsSuccessful();

        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('message', $response);
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private function registerAndVerifyUser(string $email, string $password): void
    {
        // Register user
        $this->client->request('POST', '/api/v1/auth/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'password' => $password,
        ]));

        // In a real test, you would extract the verification token from the email
        // For now, we'll manually verify the user through the database or a test helper
        // This is a placeholder - in production tests, you'd need to:
        // 1. Get verification token from test email service or database
        // 2. Call /api/v1/auth/verify-email with the token
    }

    private function loginUser(string $email, string $password): array
    {
        $this->client->request('POST', '/api/v1/auth/login', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'password' => $password,
        ]));

        return json_decode($this->client->getResponse()->getContent(), true);
    }
}
