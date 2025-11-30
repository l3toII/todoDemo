<?php

namespace App\Tests\Unit\Service;

use App\Service\EmailService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Twig\Environment;

/**
 * Unit tests for EmailService
 */
class EmailServiceTest extends TestCase
{
    private MailerInterface $mailer;
    private Environment $twig;
    private EmailService $service;

    protected function setUp(): void
    {
        $this->mailer = $this->createMock(MailerInterface::class);
        $this->twig = $this->createMock(Environment::class);
        $this->service = new EmailService($this->mailer, $this->twig);
    }

    public function testSendVerificationEmailCallsMailer(): void
    {
        $this->twig->method('render')->willReturn('rendered content');

        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->with($this->isInstanceOf(Email::class));

        $this->service->sendVerificationEmail('test@example.com', 'https://example.com/verify?token=abc123');
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

        $this->mailer->method('send');
        $this->service->sendVerificationEmail('test@example.com', 'https://example.com/verify');
    }

    public function testSendVerificationEmailSetsCorrectRecipient(): void
    {
        $this->twig->method('render')->willReturn('rendered content');

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
        $this->twig->method('render')->willReturn('rendered content');

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

    public function testSendVerificationEmailSetsBothHtmlAndText(): void
    {
        $this->twig->method('render')
            ->willReturnOnConsecutiveCalls('html content', 'text content');

        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $this->service->sendVerificationEmail('test@example.com', 'https://example.com/verify');

        $this->assertNotNull($capturedEmail);
        $this->assertEquals('html content', $capturedEmail->getHtmlBody());
        $this->assertEquals('text content', $capturedEmail->getTextBody());
    }

    public function testSendPasswordResetEmailCallsMailer(): void
    {
        $this->twig->method('render')->willReturn('rendered content');

        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->with($this->isInstanceOf(Email::class));

        $this->service->sendPasswordResetEmail('test@example.com', 'https://example.com/reset?token=abc123');
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

        $this->mailer->method('send');
        $this->service->sendPasswordResetEmail('test@example.com', 'https://example.com/reset');
    }

    public function testSendPasswordResetEmailSetsCorrectRecipient(): void
    {
        $this->twig->method('render')->willReturn('rendered content');

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
        $this->twig->method('render')->willReturn('rendered content');

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

    public function testSendPasswordResetEmailSetsBothHtmlAndText(): void
    {
        $this->twig->method('render')
            ->willReturnOnConsecutiveCalls('html content', 'text content');

        $capturedEmail = null;
        $this->mailer
            ->expects($this->once())
            ->method('send')
            ->willReturnCallback(function (Email $email) use (&$capturedEmail) {
                $capturedEmail = $email;
            });

        $this->service->sendPasswordResetEmail('test@example.com', 'https://example.com/reset');

        $this->assertNotNull($capturedEmail);
        $this->assertEquals('html content', $capturedEmail->getHtmlBody());
        $this->assertEquals('text content', $capturedEmail->getTextBody());
    }
}
