<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Project;
use App\Entity\Task;
use App\Entity\User;
use App\Repository\ProjectRepository;
use App\Repository\TaskRepository;

/**
 * ProjectService handles GTD project workflow and status transitions.
 *
 * GTD Project Concepts:
 * - A project is any outcome requiring more than one action
 * - Each active project should have at least one "next action" defined
 * - Projects without next actions need review attention (FR-018)
 * - Projects can have a review date for weekly review
 */
class ProjectService
{
    /**
     * Valid status transitions from each status.
     * Key = current status, Value = array of allowed target statuses
     */
    private const STATUS_TRANSITIONS = [
        Project::STATUS_ACTIVE => [
            Project::STATUS_ON_HOLD,
            Project::STATUS_COMPLETED,
            Project::STATUS_CANCELLED,
        ],
        Project::STATUS_ON_HOLD => [
            Project::STATUS_ACTIVE,
            Project::STATUS_CANCELLED,
        ],
        Project::STATUS_COMPLETED => [
            Project::STATUS_ACTIVE, // Can reopen
        ],
        Project::STATUS_CANCELLED => [
            Project::STATUS_ACTIVE, // Can reopen
        ],
    ];

    public function __construct(
        private readonly ProjectRepository $projectRepository,
        private readonly TaskRepository $taskRepository,
    ) {
    }

    // =========================================================================
    // Status Transition Validation
    // =========================================================================

    /**
     * Check if a status transition is valid.
     */
    public function isValidTransition(string $fromStatus, string $toStatus): bool
    {
        if ($fromStatus === $toStatus) {
            return true; // No change is always valid
        }

        $allowedTransitions = self::STATUS_TRANSITIONS[$fromStatus] ?? [];

        return in_array($toStatus, $allowedTransitions, true);
    }

    /**
     * Get allowed target statuses from a given status.
     *
     * @return string[]
     */
    public function getAllowedTransitions(string $fromStatus): array
    {
        return self::STATUS_TRANSITIONS[$fromStatus] ?? [];
    }

    // =========================================================================
    // Project CRUD Operations
    // =========================================================================

    /**
     * Create a new project.
     */
    public function create(User $user, string $title, ?string $outcome = null): Project
    {
        $project = new Project();
        $project->setUser($user);
        $project->setTitle($title);

        if ($outcome !== null) {
            $project->setOutcome($outcome);
        }

        // Set position to max + 1
        $maxPosition = $this->projectRepository->getMaxPositionByUser($user);
        $project->setPosition($maxPosition + 1);

        $this->projectRepository->save($project);

        return $project;
    }

    /**
     * Update project status with validation.
     *
     * @throws \InvalidArgumentException If transition is invalid
     */
    public function updateStatus(Project $project, string $targetStatus): Project
    {
        $currentStatus = $project->getStatus();

        if (!$this->isValidTransition($currentStatus, $targetStatus)) {
            throw new \InvalidArgumentException(
                sprintf(
                    'Invalid status transition from "%s" to "%s". Allowed transitions: %s',
                    $currentStatus,
                    $targetStatus,
                    implode(', ', $this->getAllowedTransitions($currentStatus))
                )
            );
        }

        // Use entity methods for status changes to ensure side effects are applied
        match ($targetStatus) {
            Project::STATUS_COMPLETED => $project->complete(),
            Project::STATUS_ON_HOLD => $project->putOnHold(),
            Project::STATUS_ACTIVE => $project->activate(),
            Project::STATUS_CANCELLED => $project->cancel(),
            default => null,
        };

        $this->projectRepository->save($project);

        return $project;
    }

    /**
     * Mark project as completed.
     */
    public function complete(Project $project): Project
    {
        return $this->updateStatus($project, Project::STATUS_COMPLETED);
    }

    /**
     * Put project on hold.
     */
    public function putOnHold(Project $project): Project
    {
        return $this->updateStatus($project, Project::STATUS_ON_HOLD);
    }

    /**
     * Activate a project (from on_hold, completed, or cancelled).
     */
    public function activate(Project $project): Project
    {
        return $this->updateStatus($project, Project::STATUS_ACTIVE);
    }

    /**
     * Cancel a project.
     */
    public function cancel(Project $project): Project
    {
        return $this->updateStatus($project, Project::STATUS_CANCELLED);
    }

    // =========================================================================
    // Next Action Logic (FR-017)
    // =========================================================================

    /**
     * Get the project's next action (first next_action task by position).
     * FR-017: System MUST automatically identify the next action of a project.
     */
    public function getNextAction(Project $project): ?Task
    {
        $nextActions = $this->taskRepository->findNextActionsByProject($project);

        return $nextActions[0] ?? null;
    }

    /**
     * Check if project has at least one next action defined.
     */
    public function hasNextAction(Project $project): bool
    {
        return $this->getNextAction($project) !== null;
    }

    /**
     * Count the number of next actions for a project.
     */
    public function countNextActions(Project $project): int
    {
        return count($this->taskRepository->findNextActionsByProject($project));
    }

    // =========================================================================
    // Review Logic (FR-018)
    // =========================================================================

    /**
     * Check if a project needs review.
     * FR-018: System MUST flag projects without a defined next action.
     *
     * A project needs review if:
     * - It has no next action defined, OR
     * - Its review date has passed
     */
    public function needsReview(Project $project): bool
    {
        // No next action means project needs attention
        if (!$this->hasNextAction($project)) {
            return true;
        }

        // Check if review date has passed
        $reviewDate = $project->getReviewDate();
        if ($reviewDate !== null) {
            $today = new \DateTimeImmutable('today');
            if ($reviewDate <= $today) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get all active projects that need attention (no next action).
     * FR-018: System MUST flag projects without a defined next action.
     *
     * @return Project[]
     */
    public function getProjectsNeedingAttention(User $user): array
    {
        return $this->projectRepository->findWithoutNextAction($user);
    }

    /**
     * Get all projects due for review.
     *
     * @return Project[]
     */
    public function getProjectsDueForReview(User $user): array
    {
        return $this->projectRepository->findDueForReview($user);
    }

    // =========================================================================
    // Task Statistics
    // =========================================================================

    /**
     * Count all non-deleted tasks in a project.
     */
    public function countTasks(Project $project): int
    {
        return $this->taskRepository->countByProject($project);
    }
}
