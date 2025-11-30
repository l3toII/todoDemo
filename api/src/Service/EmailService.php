<?php

namespace App\Service;

use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

class EmailService
{
    public function __construct(
        private readonly MailerInterface $mailer,
    ) {
    }

    public function sendVerificationEmail(string $recipientEmail, string $verificationUrl): void
    {
        $html = $this->renderVerificationEmailHtml($verificationUrl);

        $email = (new Email())
            ->to(new Address($recipientEmail))
            ->subject('Verify Your Email - GTD Todo App')
            ->html($html);

        $this->mailer->send($email);
    }

    public function sendPasswordResetEmail(string $recipientEmail, string $resetUrl): void
    {
        $html = $this->renderPasswordResetEmailHtml($resetUrl);

        $email = (new Email())
            ->to(new Address($recipientEmail))
            ->subject('Reset Your Password - GTD Todo App')
            ->html($html);

        $this->mailer->send($email);
    }

    private function renderVerificationEmailHtml(string $verificationUrl): string
    {
        $escapedUrl = htmlspecialchars($verificationUrl, ENT_QUOTES, 'UTF-8');

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #2563eb;
            margin-top: 0;
            font-size: 24px;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 32px;
            border-radius: 6px;
            margin: 24px 0;
            font-weight: 500;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
        }
        .link {
            color: #2563eb;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to GTD Todo App!</h1>

        <p>Hi there,</p>

        <p>Thank you for signing up for GTD Todo App. To complete your registration and start organizing your tasks with the Getting Things Done methodology, please verify your email address.</p>

        <p style="text-align: center;">
            <a href="{$escapedUrl}" class="button">Verify Email Address</a>
        </p>

        <p>Or copy and paste this link into your browser:</p>
        <p class="link">{$escapedUrl}</p>

        <p>This verification link will expire in 24 hours.</p>

        <div class="footer">
            <p>If you didn't create an account with GTD Todo App, you can safely ignore this email.</p>
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    private function renderPasswordResetEmailHtml(string $resetUrl): string
    {
        $escapedUrl = htmlspecialchars($resetUrl, ENT_QUOTES, 'UTF-8');

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #2563eb;
            margin-top: 0;
            font-size: 24px;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 32px;
            border-radius: 6px;
            margin: 24px 0;
            font-weight: 500;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin: 24px 0;
            border-radius: 4px;
        }
        .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
        }
        .link {
            color: #2563eb;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Reset Your Password</h1>

        <p>Hi there,</p>

        <p>We received a request to reset the password for your GTD Todo App account. Click the button below to create a new password:</p>

        <p style="text-align: center;">
            <a href="{$escapedUrl}" class="button">Reset Password</a>
        </p>

        <p>Or copy and paste this link into your browser:</p>
        <p class="link">{$escapedUrl}</p>

        <p>This password reset link will expire in 1 hour.</p>

        <div class="warning">
            <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        </div>

        <div class="footer">
            <p>For security reasons, this link can only be used once.</p>
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
HTML;
    }
}
