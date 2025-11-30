<?php

namespace App\Tests\Unit\Service;

use App\Service\EmailService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

/**
 * Unit tests for EmailService
 */
class EmailServiceTest extends TestCase
{
    private MailerInterface $mailer;
    private EmailService $service;

    protected function setUp(): void
    {
        $this->mailer = $this->createMock(MailerInterface::class);
        $this->service = new EmailService($this->mailer);
    }

    // =========================================================================
    // Verification Email Tests
    // =========================================================================

    public function testSendVerificationEmailCallsMailer(): void
    {
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->with($this->isInstanceOf(Email::class));

        $this->service->sendVerificationEmail('test@example.com', 'https://example.com/verify?token=abc123');
    }

    public function testSendVerificationEmailSetsCorrectRecipient(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $this->service->sendVerificationEmail('user@example.com', 'https://example.com/verify');

        $this->assertNotNull($capturedEmail);
        $to = $capturedEmail->getTo();
        $this->assertCount(1, $to);
        $this->assertEquals('user@example.com', $to[0]->getAddress());
    }

    public function testSendVerificationEmailSetsCorrectSubject(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $this->service->sendVerificationEmail('test@example.com', 'https://example.com/verify');

        $this->assertNotNull($capturedEmail);
        $this->assertEquals('Verify Your Email - GTD Todo App', $capturedEmail->getSubject());
    }

    public function testSendVerificationEmailContainsVerificationUrl(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $verificationUrl = 'https://example.com/verify-email?token=abc123def456';
        $this->service->sendVerificationEmail('test@example.com', $verificationUrl);

        $this->assertNotNull($capturedEmail);
        $htmlBody = $capturedEmail->getHtmlBody();
        $this->assertStringContainsString($verificationUrl, $htmlBody);
    }

    public function testSendVerificationEmailContainsWelcomeMessage(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $this->service->sendVerificationEmail('test@example.com', 'https://example.com/verify');

        $this->assertNotNull($capturedEmail);
        $htmlBody = $capturedEmail->getHtmlBody();
        $this->assertStringContainsString('Welcome to GTD Todo App', $htmlBody);
    }

    public function testSendVerificationEmailContainsExpiryNotice(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $this->service->sendVerificationEmail('test@example.com', 'https://example.com/verify');

        $this->assertNotNull($capturedEmail);
        $htmlBody = $capturedEmail->getHtmlBody();
        $this->assertStringContainsString('24 hours', $htmlBody);
    }

    public function testSendVerificationEmailEscapesUrlForSecurity(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        // URL with characters that should be escaped
        $maliciousUrl = 'https://example.com/verify?token=abc<script>alert("xss")</script>';
        $this->service->sendVerificationEmail('test@example.com', $maliciousUrl);

        $this->assertNotNull($capturedEmail);
        $htmlBody = $capturedEmail->getHtmlBody();
        // Should not contain unescaped script tag
        $this->assertStringNotContainsString('<script>', $htmlBody);
        // Should contain escaped version
        $this->assertStringContainsString('&lt;script&gt;', $htmlBody);
    }

    // =========================================================================
    // Password Reset Email Tests
    // =========================================================================

    public function testSendPasswordResetEmailCallsMailer(): void
    {
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->with($this->isInstanceOf(Email::class));

        $this->service->sendPasswordResetEmail('test@example.com', 'https://example.com/reset?token=abc123');
    }

    public function testSendPasswordResetEmailSetsCorrectRecipient(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $this->service->sendPasswordResetEmail('user@example.com', 'https://example.com/reset');

        $this->assertNotNull($capturedEmail);
        $to = $capturedEmail->getTo();
        $this->assertCount(1, $to);
        $this->assertEquals('user@example.com', $to[0]->getAddress());
    }

    public function testSendPasswordResetEmailSetsCorrectSubject(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $this->service->sendPasswordResetEmail('test@example.com', 'https://example.com/reset');

        $this->assertNotNull($capturedEmail);
        $this->assertEquals('Reset Your Password - GTD Todo App', $capturedEmail->getSubject());
    }

    public function testSendPasswordResetEmailContainsResetUrl(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $resetUrl = 'https://example.com/reset-password?token=xyz789';
        $this->service->sendPasswordResetEmail('test@example.com', $resetUrl);

        $this->assertNotNull($capturedEmail);
        $htmlBody = $capturedEmail->getHtmlBody();
        $this->assertStringContainsString($resetUrl, $htmlBody);
    }

    public function testSendPasswordResetEmailContainsSecurityNotice(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $this->service->sendPasswordResetEmail('test@example.com', 'https://example.com/reset');

        $this->assertNotNull($capturedEmail);
        $htmlBody = $capturedEmail->getHtmlBody();
        $this->assertStringContainsString('Security Notice', $htmlBody);
    }

    public function testSendPasswordResetEmailContainsExpiryNotice(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $this->service->sendPasswordResetEmail('test@example.com', 'https://example.com/reset');

        $this->assertNotNull($capturedEmail);
        $htmlBody = $capturedEmail->getHtmlBody();
        $this->assertStringContainsString('1 hour', $htmlBody);
    }

    public function testSendPasswordResetEmailEscapesUrlForSecurity(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        // URL with characters that should be escaped
        $maliciousUrl = 'https://example.com/reset?token=abc<script>alert("xss")</script>';
        $this->service->sendPasswordResetEmail('test@example.com', $maliciousUrl);

        $this->assertNotNull($capturedEmail);
        $htmlBody = $capturedEmail->getHtmlBody();
        // Should not contain unescaped script tag
        $this->assertStringNotContainsString('<script>', $htmlBody);
        // Should contain escaped version
        $this->assertStringContainsString('&lt;script&gt;', $htmlBody);
    }

    // =========================================================================
    // HTML Structure Tests
    // =========================================================================

    public function testVerificationEmailHasValidHtmlStructure(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $this->service->sendVerificationEmail('test@example.com', 'https://example.com/verify');

        $this->assertNotNull($capturedEmail);
        $htmlBody = $capturedEmail->getHtmlBody();
        $this->assertStringContainsString('<!DOCTYPE html>', $htmlBody);
        $this->assertStringContainsString('<html', $htmlBody);
        $this->assertStringContainsString('</html>', $htmlBody);
    }

    public function testPasswordResetEmailHasValidHtmlStructure(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $this->service->sendPasswordResetEmail('test@example.com', 'https://example.com/reset');

        $this->assertNotNull($capturedEmail);
        $htmlBody = $capturedEmail->getHtmlBody();
        $this->assertStringContainsString('<!DOCTYPE html>', $htmlBody);
        $this->assertStringContainsString('<html', $htmlBody);
        $this->assertStringContainsString('</html>', $htmlBody);
    }

    public function testVerificationEmailContainsClickableButton(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $verificationUrl = 'https://example.com/verify?token=test';
        $this->service->sendVerificationEmail('test@example.com', $verificationUrl);

        $this->assertNotNull($capturedEmail);
        $htmlBody = $capturedEmail->getHtmlBody();
        // Check for button link
        $this->assertMatchesRegularExpression('/<a[^>]+href="[^"]*verify[^"]*"[^>]*class="[^"]*button[^"]*"/', $htmlBody);
    }

    public function testPasswordResetEmailContainsClickableButton(): void
    {
        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $resetUrl = 'https://example.com/reset?token=test';
        $this->service->sendPasswordResetEmail('test@example.com', $resetUrl);

        $this->assertNotNull($capturedEmail);
        $htmlBody = $capturedEmail->getHtmlBody();
        // Check for button link
        $this->assertMatchesRegularExpression('/<a[^>]+href="[^"]*reset[^"]*"[^>]*class="[^"]*button[^"]*"/', $htmlBody);
    }
}
