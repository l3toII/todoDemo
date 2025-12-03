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
class RegistrationController extends AbstractController
{
    private const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly ValidatorInterface $validator,
        private readonly EmailService $emailService,
    ) {
    }

    /**
     * User registration endpoint
     *
     * Creates a new user account and sends email verification link
     */
    #[Route('/auth/register', name: 'api_auth_register', methods: ['POST'])]
    public function register(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        // Validate required fields
        if (!isset($data['email']) || !isset($data['password'])) {
            return $this->json([
                'error' => 'Email and password are required',
                'code' => 'MISSING_FIELDS',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Validate email format
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return $this->json([
                'error' => 'Invalid email format',
                'code' => 'INVALID_EMAIL',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Validate password strength
        $passwordError = $this->validatePasswordStrength($data['password']);
        if ($passwordError !== null) {
            return $this->json([
                'error' => $passwordError,
                'code' => 'WEAK_PASSWORD',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Check if user already exists
        $existingUser = $this->userRepository->findByEmail($data['email']);
        if ($existingUser) {
            return $this->json([
                'error' => 'User with this email already exists',
                'code' => 'EMAIL_EXISTS',
            ], Response::HTTP_CONFLICT);
        }

        // Create new user
        $user = new User();
        $user->setEmail($data['email']);

        // Hash password
        $hashedPassword = $this->passwordHasher->hashPassword($user, $data['password']);
        $user->setPasswordHash($hashedPassword);

        // Set optional fields
        if (isset($data['timezone'])) {
            $user->setTimezone($data['timezone']);
        }

        if (isset($data['notification_preferences'])) {
            $user->setNotificationPreferences($data['notification_preferences']);
        }

        // Generate verification token
        $verificationToken = bin2hex(random_bytes(32));
        $user->setVerificationToken($verificationToken);
        $user->setVerificationTokenExpiresAt(
            (new \DateTimeImmutable())->modify(sprintf('+%d hours', self::VERIFICATION_TOKEN_EXPIRY_HOURS))
        );

        // Validate entity
        $errors = $this->validator->validate($user);
        if (count($errors) > 0) {
            $errorMessages = [];
            foreach ($errors as $error) {
                $errorMessages[$error->getPropertyPath()] = $error->getMessage();
            }

            return $this->json([
                'error' => 'Validation failed',
                'code' => 'VALIDATION_ERROR',
                'details' => $errorMessages,
            ], Response::HTTP_BAD_REQUEST);
        }

        // Save user and handle potential failures with rollback
        try {
            $this->userRepository->save($user);

            // Send verification email
            try {
                $verificationUrl = sprintf(
                    '%s/verify-email?token=%s',
                    $_ENV['WEB_URL'] ?? 'http://localhost:3000',
                    $verificationToken
                );

                $this->emailService->sendVerificationEmail($user->getEmail(), $verificationUrl);
            } catch (\Exception $e) {
                // Log error but don't fail registration
                // User can request resend if email fails
                error_log(sprintf('Failed to send verification email to %s: %s', $user->getEmail(), $e->getMessage()));
            }

            return $this->json([
                'message' => 'Registration successful. Please check your email to verify your account.',
                'user' => [
                    'id' => (string) $user->getId(),
                    'email' => $user->getEmail(),
                    'status' => $user->getStatus(),
                ],
            ], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            // Rollback: remove user if it was persisted but something failed after
            if ($user->getId() !== null) {
                $this->userRepository->remove($user);
            }

            return $this->json([
                'error' => 'Registration failed. Please try again.',
                'code' => 'REGISTRATION_FAILED',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Email verification endpoint
     *
     * Verifies user email with token from verification link
     */
    #[Route('/auth/verify-email', name: 'api_auth_verify_email', methods: ['POST'])]
    public function verifyEmail(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['token'])) {
            return $this->json([
                'error' => 'Verification token is required',
                'code' => 'MISSING_TOKEN',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Find user by verification token
        $user = $this->userRepository->findByVerificationToken($data['token']);

        if (!$user) {
            return $this->json([
                'error' => 'Invalid verification token',
                'code' => 'INVALID_TOKEN',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Check if token is expired
        if ($user->isVerificationTokenExpired()) {
            return $this->json([
                'error' => 'Verification token has expired',
                'code' => 'TOKEN_EXPIRED',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Check if already verified
        if ($user->isVerified()) {
            return $this->json([
                'message' => 'Email already verified',
                'user' => [
                    'id' => (string) $user->getId(),
                    'email' => $user->getEmail(),
                    'status' => $user->getStatus(),
                ],
            ]);
        }

        // Verify the user
        $user->markAsVerified();
        $this->userRepository->save($user);

        return $this->json([
            'message' => 'Email verified successfully. You can now log in.',
            'user' => [
                'id' => (string) $user->getId(),
                'email' => $user->getEmail(),
                'status' => $user->getStatus(),
            ],
        ]);
    }

    /**
     * Resend verification email endpoint
     *
     * Generates a new verification token and resends the email
     */
    #[Route('/auth/resend-verification', name: 'api_auth_resend_verification', methods: ['POST'])]
    public function resendVerification(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['email'])) {
            return $this->json([
                'error' => 'Email is required',
                'code' => 'MISSING_EMAIL',
            ], Response::HTTP_BAD_REQUEST);
        }

        $user = $this->userRepository->findByEmail($data['email']);

        if (!$user) {
            // Don't reveal if user exists or not for security
            return $this->json([
                'message' => 'If an account exists with this email, a verification email has been sent.',
            ]);
        }

        // Check if already verified
        if ($user->isVerified()) {
            return $this->json([
                'message' => 'Email already verified.',
            ]);
        }

        // Generate new verification token
        $verificationToken = bin2hex(random_bytes(32));
        $user->setVerificationToken($verificationToken);
        $user->setVerificationTokenExpiresAt(
            (new \DateTimeImmutable())->modify(sprintf('+%d hours', self::VERIFICATION_TOKEN_EXPIRY_HOURS))
        );

        $this->userRepository->save($user);

        // Send verification email
        try {
            $verificationUrl = sprintf(
                '%s/verify-email?token=%s',
                $_ENV['WEB_URL'] ?? 'http://localhost:3000',
                $verificationToken
            );

            $this->emailService->sendVerificationEmail($user->getEmail(), $verificationUrl);
        } catch (\Exception $e) {
            // Log error but don't reveal to user
            error_log(sprintf('Failed to resend verification email to %s: %s', $user->getEmail(), $e->getMessage()));
        }

        return $this->json([
            'message' => 'If an account exists with this email, a verification email has been sent.',
        ]);
    }

    /**
     * Validate password strength requirements.
     *
     * @return string|null Error message if validation fails, null if valid
     */
    private function validatePasswordStrength(string $password): ?string
    {
        if (strlen($password) < 8) {
            return 'Password must be at least 8 characters long';
        }

        if (!preg_match('/[A-Z]/', $password)) {
            return 'Password must contain at least one uppercase letter';
        }

        if (!preg_match('/[0-9]/', $password)) {
            return 'Password must contain at least one number';
        }

        return null;
    }
}
