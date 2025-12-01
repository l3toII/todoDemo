<?php

namespace App\Tests\Unit\Service;

use App\Service\EmailService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Twig\Environment;

/**
 * Unit tests for EmailService (Resend HTTP API)
 */
class EmailServiceTest extends TestCase
{
    private Environment $twig;
    private const API_KEY = 'test_api_key';
    private const FROM_EMAIL = 'noreply@test.com';

    protected function setUp(): void
    {
        $this->twig = $this->createMock(Environment::class);
    }

    private function createService(MockHttpClient $httpClient): EmailService
    {
        return new EmailService(
            $this->twig,
            self::FROM_EMAIL,
            $httpClient,
            null,  // No SMTP mailer for HTTP API tests
            self::API_KEY
        );
    }

    public function testSendVerificationEmailCallsResendApi(): void
    {
        $this->twig->method('render')->willReturn('rendered content');

        $mockResponse = new MockResponse('{"id": "email_123"}', ['http_code' => 200]);
        $httpClient = new MockHttpClient($mockResponse);

        $service = $this->createService($httpClient);
        $service->sendVerificationEmail('test@example.com', 'https://example.com/verify?token=abc123');

        $this->assertSame(1, $httpClient->getRequestsCount());
    }

    public function testSendVerificationEmailRendersCorrectTemplates(): void
    {
        $this->twig
            ->expects($this->exactly(2))
            ->method('render')
            ->willReturnCallback(function ($template, $params) {
                $this->assertContains($template, [
                    'email/verification.html.twig',
                    'email/verification.txt.twig'
                ]);
                $this->assertArrayHasKey('verificationUrl', $params);
                return 'rendered content';
            });

        $mockResponse = new MockResponse('{"id": "email_123"}', ['http_code' => 200]);
        $httpClient = new MockHttpClient($mockResponse);

        $service = $this->createService($httpClient);
        $service->sendVerificationEmail('test@example.com', 'https://example.com/verify');
    }

    public function testSendVerificationEmailSetsCorrectRecipient(): void
    {
        $this->twig->method('render')->willReturn('rendered content');

        $capturedRequest = null;
        $mockResponse = new MockResponse('{"id": "email_123"}', ['http_code' => 200]);
        $httpClient = new MockHttpClient(function ($method, $url, $options) use (&$capturedRequest, $mockResponse) {
            $capturedRequest = $options;
            return $mockResponse;
        });

        $service = $this->createService($httpClient);
        $service->sendVerificationEmail('user@example.com', 'https://example.com/verify');

        $this->assertNotNull($capturedRequest);
        $body = json_decode($capturedRequest['body'], true);
        $this->assertEquals(['user@example.com'], $body['to']);
    }

    public function testSendVerificationEmailSetsCorrectSubject(): void
    {
        $this->twig->method('render')->willReturn('rendered content');

        $capturedRequest = null;
        $mockResponse = new MockResponse('{"id": "email_123"}', ['http_code' => 200]);
        $httpClient = new MockHttpClient(function ($method, $url, $options) use (&$capturedRequest, $mockResponse) {
            $capturedRequest = $options;
            return $mockResponse;
        });

        $service = $this->createService($httpClient);
        $service->sendVerificationEmail('test@example.com', 'https://example.com/verify');

        $this->assertNotNull($capturedRequest);
        $body = json_decode($capturedRequest['body'], true);
        $this->assertEquals('Verify Your Email - GTD Todo App', $body['subject']);
    }

    public function testSendVerificationEmailSetsBothHtmlAndText(): void
    {
        $this->twig->method('render')
            ->willReturnOnConsecutiveCalls('html content', 'text content');

        $capturedRequest = null;
        $mockResponse = new MockResponse('{"id": "email_123"}', ['http_code' => 200]);
        $httpClient = new MockHttpClient(function ($method, $url, $options) use (&$capturedRequest, $mockResponse) {
            $capturedRequest = $options;
            return $mockResponse;
        });

        $service = $this->createService($httpClient);
        $service->sendVerificationEmail('test@example.com', 'https://example.com/verify');

        $this->assertNotNull($capturedRequest);
        $body = json_decode($capturedRequest['body'], true);
        $this->assertEquals('html content', $body['html']);
        $this->assertEquals('text content', $body['text']);
    }

    public function testSendPasswordResetEmailCallsResendApi(): void
    {
        $this->twig->method('render')->willReturn('rendered content');

        $mockResponse = new MockResponse('{"id": "email_123"}', ['http_code' => 200]);
        $httpClient = new MockHttpClient($mockResponse);

        $service = $this->createService($httpClient);
        $service->sendPasswordResetEmail('test@example.com', 'https://example.com/reset?token=abc123');

        $this->assertSame(1, $httpClient->getRequestsCount());
    }

    public function testSendPasswordResetEmailRendersCorrectTemplates(): void
    {
        $this->twig
            ->expects($this->exactly(2))
            ->method('render')
            ->willReturnCallback(function ($template, $params) {
                $this->assertContains($template, [
                    'email/password_reset.html.twig',
                    'email/password_reset.txt.twig'
                ]);
                $this->assertArrayHasKey('resetUrl', $params);
                return 'rendered content';
            });

        $mockResponse = new MockResponse('{"id": "email_123"}', ['http_code' => 200]);
        $httpClient = new MockHttpClient($mockResponse);

        $service = $this->createService($httpClient);
        $service->sendPasswordResetEmail('test@example.com', 'https://example.com/reset');
    }

    public function testSendPasswordResetEmailSetsCorrectRecipient(): void
    {
        $this->twig->method('render')->willReturn('rendered content');

        $capturedRequest = null;
        $mockResponse = new MockResponse('{"id": "email_123"}', ['http_code' => 200]);
        $httpClient = new MockHttpClient(function ($method, $url, $options) use (&$capturedRequest, $mockResponse) {
            $capturedRequest = $options;
            return $mockResponse;
        });

        $service = $this->createService($httpClient);
        $service->sendPasswordResetEmail('user@example.com', 'https://example.com/reset');

        $this->assertNotNull($capturedRequest);
        $body = json_decode($capturedRequest['body'], true);
        $this->assertEquals(['user@example.com'], $body['to']);
    }

    public function testSendPasswordResetEmailSetsCorrectSubject(): void
    {
        $this->twig->method('render')->willReturn('rendered content');

        $capturedRequest = null;
        $mockResponse = new MockResponse('{"id": "email_123"}', ['http_code' => 200]);
        $httpClient = new MockHttpClient(function ($method, $url, $options) use (&$capturedRequest, $mockResponse) {
            $capturedRequest = $options;
            return $mockResponse;
        });

        $service = $this->createService($httpClient);
        $service->sendPasswordResetEmail('test@example.com', 'https://example.com/reset');

        $this->assertNotNull($capturedRequest);
        $body = json_decode($capturedRequest['body'], true);
        $this->assertEquals('Reset Your Password - GTD Todo App', $body['subject']);
    }

    public function testSendPasswordResetEmailSetsBothHtmlAndText(): void
    {
        $this->twig->method('render')
            ->willReturnOnConsecutiveCalls('html content', 'text content');

        $capturedRequest = null;
        $mockResponse = new MockResponse('{"id": "email_123"}', ['http_code' => 200]);
        $httpClient = new MockHttpClient(function ($method, $url, $options) use (&$capturedRequest, $mockResponse) {
            $capturedRequest = $options;
            return $mockResponse;
        });

        $service = $this->createService($httpClient);
        $service->sendPasswordResetEmail('test@example.com', 'https://example.com/reset');

        $this->assertNotNull($capturedRequest);
        $body = json_decode($capturedRequest['body'], true);
        $this->assertEquals('html content', $body['html']);
        $this->assertEquals('text content', $body['text']);
    }

    public function testSendEmailThrowsOnApiError(): void
    {
        $this->twig->method('render')->willReturn('rendered content');

        $mockResponse = new MockResponse('{"message": "Invalid API key"}', ['http_code' => 401]);
        $httpClient = new MockHttpClient($mockResponse);

        $service = $this->createService($httpClient);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Resend API error: Invalid API key');

        $service->sendVerificationEmail('test@example.com', 'https://example.com/verify');
    }

    public function testSendEmailSetsCorrectAuthorizationHeader(): void
    {
        $this->twig->method('render')->willReturn('rendered content');

        $capturedRequest = null;
        $mockResponse = new MockResponse('{"id": "email_123"}', ['http_code' => 200]);
        $httpClient = new MockHttpClient(function ($method, $url, $options) use (&$capturedRequest, $mockResponse) {
            $capturedRequest = $options;
            return $mockResponse;
        });

        $service = $this->createService($httpClient);
        $service->sendVerificationEmail('test@example.com', 'https://example.com/verify');

        $this->assertNotNull($capturedRequest);
        $this->assertArrayHasKey('headers', $capturedRequest);
        $this->assertContains('Authorization: Bearer ' . self::API_KEY, $capturedRequest['headers']);
    }

    public function testSendEmailSetsCorrectFromEmail(): void
    {
        $this->twig->method('render')->willReturn('rendered content');

        $capturedRequest = null;
        $mockResponse = new MockResponse('{"id": "email_123"}', ['http_code' => 200]);
        $httpClient = new MockHttpClient(function ($method, $url, $options) use (&$capturedRequest, $mockResponse) {
            $capturedRequest = $options;
            return $mockResponse;
        });

        $service = $this->createService($httpClient);
        $service->sendVerificationEmail('test@example.com', 'https://example.com/verify');

        $this->assertNotNull($capturedRequest);
        $body = json_decode($capturedRequest['body'], true);
        $this->assertEquals(self::FROM_EMAIL, $body['from']);
    }
}
