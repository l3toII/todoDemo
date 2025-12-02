<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Task;
use App\Repository\TaskRepository;

/**
 * TaskService handles GTD clarification workflow and status transitions.
 *
 * GTD Clarification Flow:
 * 1. Is it actionable?
 *    - NO → Reference (non-actionable info) or Someday/Maybe (might do later) or Delete (trash)
 *    - YES → Continue...
 * 2. Can it be done in < 2 minutes?
 *    - YES → Do it now, then mark Complete
 *    - NO → Continue...
 * 3. Are you the right person?
 *    - NO → Waiting For (delegated)
 *    - YES → Next Action (or add to project)
 */
class TaskService
{
    /**
     * Valid status transitions from each status.
     * Key = current status, Value = array of allowed target statuses
     */
    private const STATUS_TRANSITIONS = [
        Task::STATUS_INBOX => [
            Task::STATUS_NEXT_ACTION,
            Task::STATUS_WAITING_FOR,
            Task::STATUS_SOMEDAY_MAYBE,
            Task::STATUS_REFERENCE,
            Task::STATUS_COMPLETED,
            Task::STATUS_DELETED,
        ],
        Task::STATUS_CLARIFIED => [
            Task::STATUS_NEXT_ACTION,
            Task::STATUS_WAITING_FOR,
            Task::STATUS_SOMEDAY_MAYBE,
            Task::STATUS_REFERENCE,
            Task::STATUS_COMPLETED,
            Task::STATUS_DELETED,
            Task::STATUS_INBOX, // Can send back to inbox for re-processing
        ],
        Task::STATUS_NEXT_ACTION => [
            Task::STATUS_WAITING_FOR,
            Task::STATUS_SOMEDAY_MAYBE,
            Task::STATUS_COMPLETED,
            Task::STATUS_DELETED,
            Task::STATUS_INBOX, // Can send back to inbox
        ],
        Task::STATUS_WAITING_FOR => [
            Task::STATUS_NEXT_ACTION,
            Task::STATUS_SOMEDAY_MAYBE,
            Task::STATUS_COMPLETED,
            Task::STATUS_DELETED,
            Task::STATUS_INBOX, // Can send back to inbox
        ],
        Task::STATUS_SOMEDAY_MAYBE => [
            Task::STATUS_NEXT_ACTION,
            Task::STATUS_WAITING_FOR,
            Task::STATUS_REFERENCE,
            Task::STATUS_COMPLETED,
            Task::STATUS_DELETED,
            Task::STATUS_INBOX, // Can send back to inbox
        ],
        Task::STATUS_REFERENCE => [
            Task::STATUS_SOMEDAY_MAYBE,
            Task::STATUS_DELETED,
            Task::STATUS_INBOX, // Can send back to inbox
        ],
        Task::STATUS_COMPLETED => [
            Task::STATUS_INBOX, // Can restore to inbox
            Task::STATUS_DELETED,
        ],
        Task::STATUS_DELETED => [
            Task::STATUS_INBOX, // Can restore to inbox
        ],
    ];

    public function __construct(
        private readonly TaskRepository $taskRepository,
    ) {
    }

    /**
     * Check if a status transition is valid according to GTD workflow.
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

    /**
     * Clarify a task by updating its status and optional metadata.
     *
     * @param Task $task The task to clarify
     * @param string $targetStatus The target status after clarification
     * @param array<string, mixed> $options Additional clarification options:
     *   - 'waiting_for_whom': string (required if status is waiting_for)
     *   - 'energy_level': string (low/medium/high)
     *   - 'time_estimate': int (minutes)
     *   - 'due_date': string (Y-m-d format)
     *   - 'notes': string (additional notes)
     *
     * @throws \InvalidArgumentException If transition is invalid
     */
    public function clarify(Task $task, string $targetStatus, array $options = []): Task
    {
        $currentStatus = $task->getStatus();

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

        // Validate target status
        if (!in_array($targetStatus, Task::STATUSES, true)) {
            throw new \InvalidArgumentException(
                sprintf('Invalid target status "%s"', $targetStatus)
            );
        }

        // Apply the status change
        $task->setStatus($targetStatus);

        // Apply optional metadata
        $this->applyOptions($task, $options);

        // Save the task
        $this->taskRepository->save($task);

        return $task;
    }

    /**
     * Quick clarification: mark task as completed (2-minute rule).
     */
    public function completeQuickly(Task $task): Task
    {
        return $this->clarify($task, Task::STATUS_COMPLETED, [
            'time_estimate' => 2,
        ]);
    }

    /**
     * Defer task to Someday/Maybe list.
     */
    public function deferToSomedayMaybe(Task $task, ?string $notes = null): Task
    {
        $options = [];
        if ($notes !== null) {
            $options['notes'] = $task->getNotes()
                ? $task->getNotes() . "\n\n" . $notes
                : $notes;
        }

        return $this->clarify($task, Task::STATUS_SOMEDAY_MAYBE, $options);
    }

    /**
     * Move task to reference (non-actionable).
     */
    public function moveToReference(Task $task): Task
    {
        return $this->clarify($task, Task::STATUS_REFERENCE);
    }

    /**
     * Delegate task (mark as waiting for someone).
     */
    public function delegateTo(Task $task, string $waitingForWhom, ?\DateTimeImmutable $dueDate = null): Task
    {
        $notes = $task->getNotes() ?? '';
        $notes = trim($notes . "\n\nWaiting for: " . $waitingForWhom);

        $options = ['notes' => $notes];

        if ($dueDate !== null) {
            $options['due_date'] = $dueDate->format('Y-m-d');
        }

        return $this->clarify($task, Task::STATUS_WAITING_FOR, $options);
    }

    /**
     * Make task a next action.
     */
    public function makeNextAction(
        Task $task,
        ?string $energyLevel = null,
        ?int $timeEstimate = null,
        ?\DateTimeImmutable $dueDate = null
    ): Task {
        $options = [];

        if ($energyLevel !== null) {
            $options['energy_level'] = $energyLevel;
        }

        if ($timeEstimate !== null) {
            $options['time_estimate'] = $timeEstimate;
        }

        if ($dueDate !== null) {
            $options['due_date'] = $dueDate->format('Y-m-d');
        }

        return $this->clarify($task, Task::STATUS_NEXT_ACTION, $options);
    }

    /**
     * Send task back to inbox for re-processing.
     */
    public function sendBackToInbox(Task $task): Task
    {
        return $this->clarify($task, Task::STATUS_INBOX);
    }

    /**
     * Trash a task (soft delete).
     */
    public function trash(Task $task): Task
    {
        return $this->clarify($task, Task::STATUS_DELETED);
    }

    /**
     * Apply optional metadata to task.
     *
     * @param array<string, mixed> $options
     */
    private function applyOptions(Task $task, array $options): void
    {
        if (isset($options['energy_level']) && in_array($options['energy_level'], Task::ENERGY_LEVELS, true)) {
            $task->setEnergyLevel($options['energy_level']);
        }

        if (isset($options['time_estimate']) && is_int($options['time_estimate']) && $options['time_estimate'] > 0) {
            $task->setTimeEstimate($options['time_estimate']);
        }

        if (isset($options['due_date'])) {
            try {
                $task->setDueDate(new \DateTimeImmutable($options['due_date']));
            } catch (\Exception) {
                // Invalid date format, skip
            }
        }

        if (isset($options['notes']) && is_string($options['notes'])) {
            $task->setNotes($options['notes']);
        }
    }
}
