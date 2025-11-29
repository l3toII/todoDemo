<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\RefreshTokenRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

/**
 * Service to handle GDPR-compliant account deletion
 *
 * Permanently deletes all user data from the system
 */
class AccountDeletionService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserRepository $userRepository,
        private readonly RefreshTokenRepository $refreshTokenRepository,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * Permanently delete user account and all associated data
     *
     * This is a hard delete - all data is removed immediately and cannot be recovered.
     * GDPR compliant - fulfills the "right to erasure" (Art. 17 GDPR)
     *
     * @param User $user The user to delete
     * @throws \Exception If deletion fails
     */
    public function deleteAccount(User $user): void
    {
        $userId = (string) $user->getId();
        $userEmail = $user->getEmail();

        $this->logger->info('Starting account deletion', [
            'user_id' => $userId,
            'email' => $userEmail,
        ]);

        try {
            // Start transaction to ensure atomicity
            $this->entityManager->beginTransaction();

            // 1. Delete all refresh tokens for this user
            // Note: These are automatically deleted via CASCADE in the database,
            // but we do it explicitly for logging purposes
            $this->deleteRefreshTokens($user);

            // 2. Delete user-related entities (will be expanded as features are added)
            // TODO: When P2-P7 entities are implemented, add:
            // - Tasks (inbox, next actions, etc.)
            // - Contexts
            // - Projects
            // - Reviews
            // - Calendar events
            // - Sync data
            $this->deleteUserEntities($user);

            // 3. Finally, delete the user entity itself
            $this->userRepository->remove($user, flush: false);

            // Commit transaction
            $this->entityManager->flush();
            $this->entityManager->commit();

            $this->logger->info('Account deletion completed successfully', [
                'user_id' => $userId,
                'email' => $userEmail,
            ]);
        } catch (\Exception $e) {
            // Rollback transaction on error
            if ($this->entityManager->getConnection()->isTransactionActive()) {
                $this->entityManager->rollback();
            }

            $this->logger->error('Account deletion failed', [
                'user_id' => $userId,
                'email' => $userEmail,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw new \RuntimeException(
                'Failed to delete account. Please try again or contact support.',
                0,
                $e
            );
        }
    }

    /**
     * Delete all refresh tokens for the user
     */
    private function deleteRefreshTokens(User $user): void
    {
        $tokens = $this->refreshTokenRepository->findBy(['user' => $user]);
        $count = count($tokens);

        foreach ($tokens as $token) {
            $this->entityManager->remove($token);
        }

        $this->logger->debug('Deleted refresh tokens', [
            'user_id' => (string) $user->getId(),
            'count' => $count,
        ]);
    }

    /**
     * Delete all user-related entities
     *
     * This method will be expanded as new features are implemented
     */
    private function deleteUserEntities(User $user): void
    {
        // TODO: Implement deletion of user-related entities as features are added:
        //
        // Phase 2 (P2): Tasks
        // $tasks = $this->taskRepository->findBy(['user' => $user]);
        // foreach ($tasks as $task) {
        //     $this->entityManager->remove($task);
        // }
        //
        // Phase 4 (P4): Contexts (user-specific ones)
        // $contexts = $this->contextRepository->findBy(['user' => $user]);
        // foreach ($contexts as $context) {
        //     $this->entityManager->remove($context);
        // }
        //
        // Phase 5 (P5): Projects
        // $projects = $this->projectRepository->findBy(['user' => $user]);
        // foreach ($projects as $project) {
        //     $this->entityManager->remove($project);
        // }
        //
        // Phase 6 (P6): Reviews
        // $reviews = $this->reviewRepository->findBy(['user' => $user]);
        // foreach ($reviews as $review) {
        //     $this->entityManager->remove($review);
        // }
        //
        // Phase 7 (P7): Calendar Events
        // $events = $this->calendarEventRepository->findBy(['user' => $user]);
        // foreach ($events as $event) {
        //     $this->entityManager->remove($event);
        // }

        $this->logger->debug('Deleted user entities', [
            'user_id' => (string) $user->getId(),
            'note' => 'Additional entity deletions will be added as features are implemented',
        ]);
    }

    /**
     * Check if account deletion is allowed for this user
     *
     * @param User $user The user to check
     * @return array{allowed: bool, reason?: string}
     */
    public function canDeleteAccount(User $user): array
    {
        // For now, all users can delete their accounts
        // In the future, you might add restrictions like:
        // - Cannot delete if user has active subscriptions
        // - Cannot delete if user is an admin or owner of shared resources
        // - Cannot delete within X days of last deletion attempt (rate limiting)

        return ['allowed' => true];
    }

    /**
     * Soft delete user account (mark as deleted but keep data)
     *
     * This is an alternative to hard delete if you need to retain data
     * for legal/business reasons. Not GDPR compliant for "right to erasure".
     */
    public function softDeleteAccount(User $user): void
    {
        $user->setStatus(User::STATUS_DELETED);
        $this->userRepository->save($user);

        // Revoke all refresh tokens
        $this->refreshTokenRepository->revokeAllForUser($user);

        $this->logger->info('Account soft deleted', [
            'user_id' => (string) $user->getId(),
            'email' => $user->getEmail(),
        ]);
    }
}
