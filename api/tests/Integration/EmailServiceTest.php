<?php

namespace App\Tests\Integration;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Mailer\Event\MessageEvent;

/**
 * Integration tests for email sending functionality
 *
 * Tests registration verification emails and password reset emails
 */
class EmailServiceTest extends WebTestCase
{
    private $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    /**
     * Test that verification email is sent during registration
     */
    public function testVerificationEmailSentOnRegistration(): void
    {
        // Enable the profiler to capture emails
        $this->client->enableProfiler();

        // Generate unique email for test
        $email = sprintf('test+%s@example.com', uniqid());

        // Register a new user
        $this->client->request('POST', '/api/v1/auth/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'password' => 'TestPassword123',
        ]));

        $this->assertResponseStatusCodeSame(201);

        // Check that an email was sent
        $mailCollector = $this->client->getProfile()->getCollector('mailer');
        $this->assertSame(1, $mailCollector->getEvents()->getMessages()->count());

        // Get the sent email
        $message = $mailCollector->getEvents()->getMessages()[0];

        // Verify email properties
        $this->assertEmailAddressContains($message, 'to', $email);
        $this->assertEmailHeaderSame($message, 'subject', 'Verify Your Email - GTD Todo App');
        $this->assertEmailHtmlBodyContains($message, 'verify-email?token=');
        $this->assertEmailHtmlBodyContains($message, 'Welcome to GTD Todo App');
    }

    /**
     * Test that verification email is sent when resending
     */
    public function testVerificationEmailSentOnResend(): void
    {
        // Enable the profiler to capture emails
        $this->client->enableProfiler();

        // First, register a user
        $email = sprintf('test+%s@example.com', uniqid());
        $this->client->request('POST', '/api/v1/auth/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'password' => 'TestPassword123',
        ]));

        $this->assertResponseStatusCodeSame(201);

        // Clear the mail collector
        $this->client->enableProfiler();

        // Resend verification email
        $this->client->request('POST', '/api/v1/auth/resend-verification', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
        ]));

        $this->assertResponseStatusCodeSame(200);

        // Check that an email was sent
        $mailCollector = $this->client->getProfile()->getCollector('mailer');
        $this->assertSame(1, $mailCollector->getEvents()->getMessages()->count());

        // Get the sent email
        $message = $mailCollector->getEvents()->getMessages()[0];

        // Verify email properties
        $this->assertEmailAddressContains($message, 'to', $email);
        $this->assertEmailHeaderSame($message, 'subject', 'Verify Your Email - GTD Todo App');
        $this->assertEmailHtmlBodyContains($message, 'verify-email?token=');
    }

    /**
     * Test that password reset email is sent
     */
    public function testPasswordResetEmailSent(): void
    {
        // Enable the profiler to capture emails
        $this->client->enableProfiler();

        // First, register and verify a user
        $email = sprintf('test+%s@example.com', uniqid());
        $this->client->request('POST', '/api/v1/auth/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'password' => 'TestPassword123',
        ]));

        $this->assertResponseStatusCodeSame(201);

        // Clear the mail collector
        $this->client->enableProfiler();

        // Request password reset
        $this->client->request('POST', '/api/v1/auth/password-reset/request', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
        ]));

        $this->assertResponseStatusCodeSame(200);

        // Check that an email was sent
        $mailCollector = $this->client->getProfile()->getCollector('mailer');
        $this->assertSame(1, $mailCollector->getEvents()->getMessages()->count());

        // Get the sent email
        $message = $mailCollector->getEvents()->getMessages()[0];

        // Verify email properties
        $this->assertEmailAddressContains($message, 'to', $email);
        $this->assertEmailHeaderSame($message, 'subject', 'Reset Your Password - GTD Todo App');
        $this->assertEmailHtmlBodyContains($message, 'reset-password?token=');
        $this->assertEmailHtmlBodyContains($message, 'Reset Your Password');
        $this->assertEmailHtmlBodyContains($message, 'Security Notice');
    }

    /**
     * Test that no email is sent for non-existent user (password reset)
     */
    public function testNoEmailSentForNonExistentUser(): void
    {
        // Enable the profiler to capture emails
        $this->client->enableProfiler();

        // Request password reset for non-existent email
        $this->client->request('POST', '/api/v1/auth/password-reset/request', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'nonexistent@example.com',
        ]));

        $this->assertResponseStatusCodeSame(200);

        // Check that no email was sent
        $mailCollector = $this->client->getProfile()->getCollector('mailer');
        $this->assertSame(0, $mailCollector->getEvents()->getMessages()->count());
    }

    /**
     * Test email templates contain proper links
     */
    public function testEmailContainsValidVerificationLink(): void
    {
        // Enable the profiler to capture emails
        $this->client->enableProfiler();

        // Register a new user
        $email = sprintf('test+%s@example.com', uniqid());
        $this->client->request('POST', '/api/v1/auth/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'password' => 'TestPassword123',
        ]));

        $this->assertResponseStatusCodeSame(201);

        // Get the sent email
        $mailCollector = $this->client->getProfile()->getCollector('mailer');
        $message = $mailCollector->getEvents()->getMessages()[0];

        // Get email HTML body
        $htmlBody = $message->getHtmlBody();

        // Verify the link format is correct
        $this->assertMatchesRegularExpression(
            '/verify-email\?token=[a-f0-9]{64}/',
            $htmlBody,
            'Email should contain a verification link with a 64-character hex token'
        );
    }

    /**
     * Test email templates contain proper reset links
     */
    public function testEmailContainsValidResetLink(): void
    {
        // Enable the profiler to capture emails
        $this->client->enableProfiler();

        // First, register a user
        $email = sprintf('test+%s@example.com', uniqid());
        $this->client->request('POST', '/api/v1/auth/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'password' => 'TestPassword123',
        ]));

        // Clear the mail collector
        $this->client->enableProfiler();

        // Request password reset
        $this->client->request('POST', '/api/v1/auth/password-reset/request', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
        ]));

        // Get the sent email
        $mailCollector = $this->client->getProfile()->getCollector('mailer');
        $message = $mailCollector->getEvents()->getMessages()[0];

        // Get email HTML body
        $htmlBody = $message->getHtmlBody();

        // Verify the link format is correct
        $this->assertMatchesRegularExpression(
            '/reset-password\?token=[a-f0-9]{64}/',
            $htmlBody,
            'Email should contain a reset link with a 64-character hex token'
        );
    }
}
