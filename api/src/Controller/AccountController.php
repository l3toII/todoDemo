<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\AccountDeletionService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/v1')]
class AccountController extends AbstractController
{
    public function __construct(
        private readonly AccountDeletionService $accountDeletionService,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly UserRepository $userRepository,
    ) {
    }

    /**
     * Delete user account endpoint (GDPR compliant)
     *
     * Permanently deletes the user account and all associated data.
     * This action cannot be undone.
     *
     * Requires password confirmation for security.
     */
    #[Route('/account', name: 'api_account_delete', methods: ['DELETE'])]
    public function deleteAccount(Request $request): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->json([
                'error' => 'Not authenticated',
                'code' => 'NOT_AUTHENTICATED',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);

        // Require password confirmation for security
        if (!isset($data['password'])) {
            return $this->json([
                'error' => 'Password confirmation is required to delete account',
                'code' => 'MISSING_PASSWORD',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Verify password (skip for Apple Sign-In users who don't have passwords)
        if ($user->getPasswordHash()) {
            if (!$this->passwordHasher->isPasswordValid($user, $data['password'])) {
                return $this->json([
                    'error' => 'Invalid password',
                    'code' => 'INVALID_PASSWORD',
                ], Response::HTTP_FORBIDDEN);
            }
        }

        // Optional confirmation text for extra safety
        if (isset($data['confirmation']) && $data['confirmation'] !== 'DELETE') {
            return $this->json([
                'error' => 'Please type "DELETE" to confirm account deletion',
                'code' => 'INVALID_CONFIRMATION',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Check if deletion is allowed
        $canDelete = $this->accountDeletionService->canDeleteAccount($user);
        if (!$canDelete['allowed']) {
            return $this->json([
                'error' => 'Account deletion not allowed',
                'code' => 'DELETION_NOT_ALLOWED',
                'reason' => $canDelete['reason'] ?? 'Unknown reason',
            ], Response::HTTP_FORBIDDEN);
        }

        try {
            // Perform hard delete
            $this->accountDeletionService->deleteAccount($user);

            return $this->json([
                'message' => 'Account deleted successfully. All your data has been permanently removed.',
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'error' => 'Failed to delete account. Please try again or contact support.',
                'code' => 'DELETION_FAILED',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get account deletion information
     *
     * Returns information about what will be deleted and whether deletion is allowed
     */
    #[Route('/account/deletion-info', name: 'api_account_deletion_info', methods: ['GET'])]
    public function getDeletionInfo(): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->json([
                'error' => 'Not authenticated',
                'code' => 'NOT_AUTHENTICATED',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $canDelete = $this->accountDeletionService->canDeleteAccount($user);

        return $this->json([
            'can_delete' => $canDelete['allowed'],
            'reason' => $canDelete['reason'] ?? null,
            'data_to_delete' => [
                'user_profile' => 'Your account, email, and preferences',
                'authentication' => 'All login sessions and refresh tokens',
                'tasks' => 'All your tasks, projects, and contexts (when implemented)',
                'calendar' => 'All calendar events and deadlines (when implemented)',
                'reviews' => 'All weekly review history (when implemented)',
            ],
            'warning' => 'This action is permanent and cannot be undone. All your data will be immediately and permanently deleted.',
            'requires_password' => $user->getPasswordHash() !== null,
        ]);
    }

    /**
     * Update user notification preferences
     */
    #[Route('/account/preferences', name: 'api_account_preferences', methods: ['PATCH'])]
    public function updatePreferences(Request $request): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->json([
                'error' => 'Not authenticated',
                'code' => 'NOT_AUTHENTICATED',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);

        // Validate timezone if provided
        if (isset($data['timezone'])) {
            $timezone = $data['timezone'];
            if (!$this->isValidTimezone($timezone)) {
                return $this->json([
                    'error' => 'Invalid timezone',
                    'code' => 'INVALID_TIMEZONE',
                    'message' => 'The provided timezone is not valid. Please use a valid IANA timezone identifier (e.g., "America/New_York", "Europe/Paris").',
                ], Response::HTTP_BAD_REQUEST);
            }
            $user->setTimezone($timezone);
        }

        // Update notification preferences if provided
        if (isset($data['notification_preferences'])) {
            $user->setNotificationPreferences($data['notification_preferences']);
        }

        // Persist changes to database
        $this->userRepository->save($user);

        return $this->json([
            'message' => 'Preferences updated successfully',
            'user' => [
                'id' => (string) $user->getId(),
                'email' => $user->getEmail(),
                'timezone' => $user->getTimezone(),
                'notification_preferences' => $user->getNotificationPreferences(),
            ],
        ]);
    }

    /**
     * Validate that a timezone string is a valid IANA timezone identifier
     */
    private function isValidTimezone(string $timezone): bool
    {
        return in_array($timezone, \DateTimeZone::listIdentifiers(), true);
    }
}
