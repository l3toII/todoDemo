<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\EmailService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/v1')]
class PasswordResetController extends AbstractController
{
    private const RESET_TOKEN_EXPIRY_HOURS = 1;

    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly ValidatorInterface $validator,
        private readonly EmailService $emailService,
    ) {
    }

    /**
     * Request password reset endpoint
     *
     * Generates a reset token and sends reset email
     */
    #[Route('/auth/password-reset/request', name: 'api_password_reset_request', methods: ['POST'])]
    public function requestReset(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['email'])) {
            return $this->json([
                'error' => 'Email is required',
                'code' => 'MISSING_EMAIL',
            ], Response::HTTP_BAD_REQUEST);
        }

        $user = $this->userRepository->findByEmail($data['email']);

        // Always return success even if user doesn't exist (security best practice)
        if (!$user) {
            return $this->json([
                'message' => 'If an account exists with this email, a password reset link has been sent.',
            ]);
        }

        // Only allow reset for active or pending verification users
        if ($user->getStatus() === User::STATUS_SUSPENDED || $user->getStatus() === User::STATUS_DELETED) {
            return $this->json([
                'message' => 'If an account exists with this email, a password reset link has been sent.',
            ]);
        }

        // Generate secure reset token
        $resetToken = bin2hex(random_bytes(32));
        $user->setPasswordResetToken($resetToken);
        $user->setPasswordResetTokenExpiresAt(
            (new \DateTimeImmutable())->modify(sprintf('+%d hours', self::RESET_TOKEN_EXPIRY_HOURS))
        );

        $this->userRepository->save($user);

        // Send password reset email
        try {
            $resetUrl = sprintf(
                '%s/password-reset/confirm?token=%s',
                $_ENV['WEB_URL'] ?? 'http://localhost:3000',
                $resetToken
            );

            $this->emailService->sendPasswordResetEmail($user->getEmail(), $resetUrl);
        } catch (\Exception $e) {
            // Log error but don't reveal to user
            error_log(sprintf('Failed to send password reset email to %s: %s', $user->getEmail(), $e->getMessage()));
        }

        return $this->json([
            'message' => 'If an account exists with this email, a password reset link has been sent.',
        ]);
    }

    /**
     * Verify reset token endpoint
     *
     * Validates the reset token without exposing whether it exists
     */
    #[Route('/auth/password-reset/verify', name: 'api_password_reset_verify', methods: ['POST'])]
    public function verifyToken(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['token'])) {
            return $this->json([
                'error' => 'Reset token is required',
                'code' => 'MISSING_TOKEN',
            ], Response::HTTP_BAD_REQUEST);
        }

        $user = $this->userRepository->findByPasswordResetToken($data['token']);

        if (!$user || $user->isPasswordResetTokenExpired()) {
            return $this->json([
                'error' => 'Invalid or expired reset token',
                'code' => 'INVALID_TOKEN',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Return masked email for UX (e.g., "j***@example.com")
        // This prevents full email exposure while still helping users confirm the account
        $email = $user->getEmail();
        $maskedEmail = $this->maskEmail($email);

        return $this->json([
            'message' => 'Token is valid',
            'email_hint' => $maskedEmail,
        ]);
    }

    /**
     * Reset password endpoint
     *
     * Resets the password using a valid reset token
     */
    #[Route('/auth/password-reset/confirm', name: 'api_password_reset_confirm', methods: ['POST'])]
    public function resetPassword(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        // Validate required fields
        if (!isset($data['token']) || !isset($data['password'])) {
            return $this->json([
                'error' => 'Reset token and new password are required',
                'code' => 'MISSING_FIELDS',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Validate password strength
        if (strlen($data['password']) < 8) {
            return $this->json([
                'error' => 'Password must be at least 8 characters long',
                'code' => 'WEAK_PASSWORD',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Find user by reset token
        $user = $this->userRepository->findByPasswordResetToken($data['token']);

        if (!$user) {
            return $this->json([
                'error' => 'Invalid reset token',
                'code' => 'INVALID_TOKEN',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Check if token is expired
        if ($user->isPasswordResetTokenExpired()) {
            return $this->json([
                'error' => 'Reset token has expired',
                'code' => 'TOKEN_EXPIRED',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Check user status
        if ($user->getStatus() === User::STATUS_SUSPENDED || $user->getStatus() === User::STATUS_DELETED) {
            return $this->json([
                'error' => 'Cannot reset password for this account',
                'code' => 'ACCOUNT_INVALID',
            ], Response::HTTP_FORBIDDEN);
        }

        // Hash and set new password
        $hashedPassword = $this->passwordHasher->hashPassword($user, $data['password']);
        $user->setPasswordHash($hashedPassword);

        // Clear reset token
        $user->clearPasswordResetToken();

        // If user was pending verification, mark as verified
        // (they proved ownership via email)
        if (!$user->isVerified()) {
            $user->markAsVerified();
        }

        $this->userRepository->save($user);

        return $this->json([
            'message' => 'Password reset successfully. You can now log in with your new password.',
        ]);
    }

    /**
     * Mask an email address for display (e.g., "john@example.com" -> "j***@e***.com")
     */
    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return '***@***.***';
        }

        [$local, $domain] = $parts;

        // Mask local part: show first char, mask rest
        $maskedLocal = strlen($local) > 1
            ? $local[0] . str_repeat('*', min(3, strlen($local) - 1))
            : '*';

        // Mask domain: show first char of domain name, mask rest, keep TLD
        $domainParts = explode('.', $domain);
        if (count($domainParts) >= 2) {
            $domainName = $domainParts[0];
            $tld = implode('.', array_slice($domainParts, 1));
            $maskedDomain = strlen($domainName) > 1
                ? $domainName[0] . str_repeat('*', min(3, strlen($domainName) - 1))
                : '*';
            $maskedDomainFull = $maskedDomain . '.' . $tld;
        } else {
            $maskedDomainFull = str_repeat('*', 3) . '.***';
        }

        return $maskedLocal . '@' . $maskedDomainFull;
    }
}
