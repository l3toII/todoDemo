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
        $html = $this->twig->render('email/verification.html.twig', [
            'verificationUrl' => $verificationUrl,
        ]);
        $text = $this->twig->render('email/verification.txt.twig', [
            'verificationUrl' => $verificationUrl,
        ]);

        $email = (new Email())
            ->to(new Address($recipientEmail))
            ->subject('Verify Your Email - GTD Todo App')
            ->text($text)
            ->html($html);

        $this->mailer->send($email);
    }

    public function sendPasswordResetEmail(string $recipientEmail, string $resetUrl): void
    {
        $html = $this->twig->render('email/password_reset.html.twig', [
            'resetUrl' => $resetUrl,
        ]);
        $text = $this->twig->render('email/password_reset.txt.twig', [
            'resetUrl' => $resetUrl,
        ]);

        $email = (new Email())
            ->to(new Address($recipientEmail))
            ->subject('Reset Your Password - GTD Todo App')
            ->text($text)
            ->html($html);

        $this->mailer->send($email);
    }
}
