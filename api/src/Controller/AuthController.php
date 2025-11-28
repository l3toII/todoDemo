<?php

namespace App\Controller;

use App\Entity\RefreshToken;
use App\Entity\User;
use App\Repository\RefreshTokenRepository;
use App\Repository\UserRepository;
use App\Service\AppleSignInService;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/v1')]
class AuthController extends AbstractController
{
    private const REFRESH_TOKEN_TTL_DAYS = 30;
    private const ACCESS_TOKEN_TTL_SECONDS = 900; // 15 minutes

    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly RefreshTokenRepository $refreshTokenRepository,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly ValidatorInterface $validator,
        private readonly AppleSignInService $appleSignInService,
    ) {
    }

    /**
     * User login endpoint
     *
     * Authenticates user with email and password, returns JWT access token
     */
    #[Route('/auth/login', name: 'api_auth_login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        // Validate request
        if (!isset($data['email']) || !isset($data['password'])) {
            return $this->json([
                'error' => 'Missing email or password',
                'code' => 'INVALID_CREDENTIALS',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Find user
        $user = $this->userRepository->findByEmail($data['email']);

        if (!$user) {
            return $this->json([
                'error' => 'Invalid credentials',
                'code' => 'INVALID_CREDENTIALS',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Check password
        if (!$user->getPasswordHash() || !$this->passwordHasher->isPasswordValid($user, $data['password'])) {
            return $this->json([
                'error' => 'Invalid credentials',
                'code' => 'INVALID_CREDENTIALS',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Check if user is active
        if (!$user->isActive()) {
            $message = match ($user->getStatus()) {
                User::STATUS_PENDING_VERIFICATION => 'Email not verified. Please check your inbox.',
                User::STATUS_SUSPENDED => 'Account suspended. Contact support.',
                User::STATUS_DELETED => 'Account deleted.',
                default => 'Account not active.',
            };

            return $this->json([
                'error' => $message,
                'code' => 'ACCOUNT_NOT_ACTIVE',
                'status' => $user->getStatus(),
            ], Response::HTTP_FORBIDDEN);
        }

        // Update last login
        $user->updateLastLogin();
        $this->userRepository->save($user);

        // Generate JWT access token
        $accessToken = $this->jwtManager->create($user);

        // Generate and store refresh token
        $refreshTokenPlain = RefreshToken::generateToken();
        $refreshTokenHash = RefreshToken::hashToken($refreshTokenPlain);

        $expiresAt = (new \DateTimeImmutable())->modify(sprintf('+%d days', self::REFRESH_TOKEN_TTL_DAYS));
        $refreshToken = new RefreshToken($user, $refreshTokenHash, $expiresAt);

        // Optional: Store device info
        $userAgent = $request->headers->get('User-Agent');
        if ($userAgent) {
            $refreshToken->setDeviceInfo(substr($userAgent, 0, 255));
        }

        $this->refreshTokenRepository->save($refreshToken);

        return $this->json([
            'access_token' => $accessToken,
            'refresh_token' => $refreshTokenPlain,
            'token_type' => 'Bearer',
            'expires_in' => self::ACCESS_TOKEN_TTL_SECONDS,
            'user' => [
                'id' => (string) $user->getId(),
                'email' => $user->getEmail(),
                'timezone' => $user->getTimezone(),
                'notification_preferences' => $user->getNotificationPreferences(),
            ],
        ]);
    }

    /**
     * Get current user information
     */
    #[Route('/auth/me', name: 'api_auth_me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->json([
                'error' => 'Not authenticated',
                'code' => 'NOT_AUTHENTICATED',
            ], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'user' => [
                'id' => (string) $user->getId(),
                'email' => $user->getEmail(),
                'status' => $user->getStatus(),
                'timezone' => $user->getTimezone(),
                'notification_preferences' => $user->getNotificationPreferences(),
                'verified_at' => $user->getVerifiedAt()?->format('c'),
                'last_login_at' => $user->getLastLoginAt()?->format('c'),
                'created_at' => $user->getCreatedAt()->format('c'),
            ],
        ]);
    }

    /**
     * Refresh token endpoint
     *
     * Exchanges a valid refresh token for a new access token and refresh token (rotation)
     */
    #[Route('/auth/refresh', name: 'api_auth_refresh', methods: ['POST'])]
    public function refresh(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['refresh_token'])) {
            return $this->json([
                'error' => 'Missing refresh token',
                'code' => 'MISSING_REFRESH_TOKEN',
            ], Response::HTTP_BAD_REQUEST);
        }

        $refreshTokenPlain = $data['refresh_token'];

        // Hash the token to find it (we use sha256 for fast lookups, not password_hash)
        $refreshTokenHash = hash('sha256', $refreshTokenPlain);

        // Find the refresh token by hash
        $refreshToken = $this->refreshTokenRepository->findOneBy(['tokenHash' => $refreshTokenHash]);

        if (!$refreshToken || !$refreshToken->isValid()) {
            return $this->json([
                'error' => 'Invalid or expired refresh token',
                'code' => 'INVALID_REFRESH_TOKEN',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $user = $refreshToken->getUser();

        // Check if user is still active
        if (!$user->isActive()) {
            return $this->json([
                'error' => 'Account not active',
                'code' => 'ACCOUNT_NOT_ACTIVE',
            ], Response::HTTP_FORBIDDEN);
        }

        // Revoke the old refresh token (rotation)
        $refreshToken->revoke();
        $this->refreshTokenRepository->save($refreshToken);

        // Generate new access token
        $accessToken = $this->jwtManager->create($user);

        // Generate new refresh token
        $newRefreshTokenPlain = RefreshToken::generateToken();
        $newRefreshTokenHash = RefreshToken::hashToken($newRefreshTokenPlain);

        $expiresAt = (new \DateTimeImmutable())->modify(sprintf('+%d days', self::REFRESH_TOKEN_TTL_DAYS));
        $newRefreshToken = new RefreshToken($user, $newRefreshTokenHash, $expiresAt);

        // Preserve device info
        if ($refreshToken->getDeviceInfo()) {
            $newRefreshToken->setDeviceInfo($refreshToken->getDeviceInfo());
        }

        $this->refreshTokenRepository->save($newRefreshToken);

        return $this->json([
            'access_token' => $accessToken,
            'refresh_token' => $newRefreshTokenPlain,
            'token_type' => 'Bearer',
            'expires_in' => self::ACCESS_TOKEN_TTL_SECONDS,
        ]);
    }

    /**
     * Logout endpoint
     *
     * Revokes all refresh tokens for the authenticated user
     */
    #[Route('/auth/logout', name: 'api_auth_logout', methods: ['POST'])]
    public function logout(): JsonResponse
    {
        $user = $this->getUser();

        if ($user instanceof User) {
            // Revoke all refresh tokens for this user
            $this->refreshTokenRepository->revokeAllForUser($user);
        }

        return $this->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Apple Sign-In authentication endpoint
     *
     * Authenticates user with Apple Sign-In identity token
     */
    #[Route('/auth/apple', name: 'api_auth_apple', methods: ['POST'])]
    public function appleSignIn(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        // Validate request
        if (!isset($data['identity_token'])) {
            return $this->json([
                'error' => 'Missing identity token',
                'code' => 'MISSING_TOKEN',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Verify Apple Sign-In token
        $verificationResult = $this->appleSignInService->verifyIdentityToken($data['identity_token']);

        if (!$verificationResult['valid']) {
            return $this->json([
                'error' => 'Invalid Apple Sign-In token',
                'code' => 'INVALID_APPLE_TOKEN',
                'details' => $verificationResult['error'] ?? 'Unknown error',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $appleId = $verificationResult['apple_id'];
        $email = $verificationResult['email'] ?? null;

        // Check if user already exists by Apple ID
        $user = $this->userRepository->findByAppleId($appleId);

        if (!$user && $email) {
            // Check if user exists by email (linking existing account)
            $user = $this->userRepository->findByEmail($email);
            if ($user) {
                // Link Apple ID to existing account
                $user->setAppleId($appleId);
                $this->userRepository->save($user);
            }
        }

        // Create new user if doesn't exist
        if (!$user) {
            if (!$email) {
                return $this->json([
                    'error' => 'Email is required for first-time Apple Sign-In',
                    'code' => 'EMAIL_REQUIRED',
                ], Response::HTTP_BAD_REQUEST);
            }

            $user = new User();
            $user->setEmail($email);
            $user->setAppleId($appleId);

            // Apple Sign-In users don't have passwords
            // They're automatically verified since Apple verified their email
            $user->markAsVerified();

            // Set optional fields from request
            if (isset($data['timezone'])) {
                $user->setTimezone($data['timezone']);
            }

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

            $this->userRepository->save($user);
        }

        // Check if user is active
        if (!$user->isActive()) {
            $message = match ($user->getStatus()) {
                User::STATUS_SUSPENDED => 'Account suspended. Contact support.',
                User::STATUS_DELETED => 'Account deleted.',
                default => 'Account not active.',
            };

            return $this->json([
                'error' => $message,
                'code' => 'ACCOUNT_NOT_ACTIVE',
                'status' => $user->getStatus(),
            ], Response::HTTP_FORBIDDEN);
        }

        // Update last login
        $user->updateLastLogin();
        $this->userRepository->save($user);

        // Generate JWT access token
        $accessToken = $this->jwtManager->create($user);

        // Generate and store refresh token
        $refreshTokenPlain = RefreshToken::generateToken();
        $refreshTokenHash = RefreshToken::hashToken($refreshTokenPlain);

        $expiresAt = (new \DateTimeImmutable())->modify(sprintf('+%d days', self::REFRESH_TOKEN_TTL_DAYS));
        $refreshToken = new RefreshToken($user, $refreshTokenHash, $expiresAt);

        // Store device info
        $userAgent = $request->headers->get('User-Agent');
        if ($userAgent) {
            $refreshToken->setDeviceInfo(substr($userAgent, 0, 255));
        }

        $this->refreshTokenRepository->save($refreshToken);

        return $this->json([
            'access_token' => $accessToken,
            'refresh_token' => $refreshTokenPlain,
            'token_type' => 'Bearer',
            'expires_in' => self::ACCESS_TOKEN_TTL_SECONDS,
            'user' => [
                'id' => (string) $user->getId(),
                'email' => $user->getEmail(),
                'timezone' => $user->getTimezone(),
                'notification_preferences' => $user->getNotificationPreferences(),
            ],
        ]);
    }
}
