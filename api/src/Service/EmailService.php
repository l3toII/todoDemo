<?php

namespace App\Service;

use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Twig\Environment;

class EmailService
{
    private const RESEND_API_URL = 'https://api.resend.com/emails';

    public function __construct(
        private readonly Environment $twig,
        private readonly string $fromEmail,
        private readonly ?HttpClientInterface $httpClient = null,
        private readonly ?MailerInterface $mailer = null,
        private readonly ?string $resendApiKey = null,
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

        // Use Resend HTTP API if API key is configured, otherwise fall back to SMTP
        if ($this->resendApiKey && $this->httpClient) {
            $this->sendViaResendApi($recipientEmail, $subject, $html, $text);
        } elseif ($this->mailer) {
            $this->sendViaSmtp($recipientEmail, $subject, $html, $text);
        } else {
            throw new \RuntimeException('No email transport configured. Set RESEND_API_KEY or MAILER_DSN.');
        }
    }

    private function sendViaResendApi(string $recipientEmail, string $subject, string $html, string $text): void
    {
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

        if ($response->getStatusCode() >= 400) {
            $content = $response->toArray(false);
            throw new \RuntimeException(
                sprintf('Resend API error: %s', $content['message'] ?? 'Unknown error')
            );
        }
    }

    private function sendViaSmtp(string $recipientEmail, string $subject, string $html, string $text): void
    {
        $email = (new Email())
            ->from(new Address($this->fromEmail))
            ->to(new Address($recipientEmail))
            ->subject($subject)
            ->text($text)
            ->html($html);

        $this->mailer->send($email);
    }
}
