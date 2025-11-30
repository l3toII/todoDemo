<?php

namespace App\Service;

use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Twig\Environment;

class EmailService
{
    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly Environment $twig,
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

        $email = (new Email())
            ->to(new Address($recipientEmail))
            ->subject($subject)
            ->text($text)
            ->html($html);

        $this->mailer->send($email);
    }
}
