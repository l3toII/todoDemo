<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;
use Twig\Environment;

class EmailService
{
    private const RESEND_API_URL = 'https://api.resend.com/emails';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly Environment $twig,
        private readonly string $resendApiKey,
        private readonly string $fromEmail = 'noreply@gtd-app.com',
    ) {
    }

    public function sendVerificationEmail(string $recipientEmail, string $verificationUrl): void
    {
        $this->sendEmail(
            $recipientEmail,
            'Verify Your Email - GTD Todo App',
            'email/verification',
            ['verificationUrl' => $verificationUrl]
        );
    }

    public function sendPasswordResetEmail(string $recipientEmail, string $resetUrl): void
    {
        $this->sendEmail(
            $recipientEmail,
            'Reset Your Password - GTD Todo App',
            'email/password_reset',
            ['resetUrl' => $resetUrl]
        );
    }

    private function sendEmail(string $recipientEmail, string $subject, string $template, array $context): void
    {
        $html = $this->twig->render($template . '.html.twig', $context);
        $text = $this->twig->render($template . '.txt.twig', $context);

        $response = $this->httpClient->request('POST', self::RESEND_API_URL, [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->resendApiKey,
                'Content-Type' => 'application/json',
            ],
            'json' => [
                'from' => $this->fromEmail,
                'to' => [$recipientEmail],
                'subject' => $subject,
                'html' => $html,
                'text' => $text,
            ],
        ]);

        // Throw exception if request failed
        if ($response->getStatusCode() >= 400) {
            $content = $response->toArray(false);
            throw new \RuntimeException(
                sprintf('Resend API error: %s', $content['message'] ?? 'Unknown error')
            );
        }
    }
}
