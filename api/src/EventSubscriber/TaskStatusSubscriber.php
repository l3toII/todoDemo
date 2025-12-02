<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Entity\Task;
use App\Service\TaskService;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Event\PreUpdateEventArgs;
use Doctrine\ORM\Events;

/**
 * Validates task status transitions according to GTD workflow rules.
 *
 * This subscriber intercepts any direct status changes on Task entities
 * and validates them against the allowed transitions defined in TaskService.
 */
#[AsDoctrineListener(event: Events::preUpdate)]
class TaskStatusSubscriber
{
    public function __construct(
        private readonly TaskService $taskService,
    ) {
    }

    public function preUpdate(PreUpdateEventArgs $args): void
    {
        $entity = $args->getObject();

        if (!$entity instanceof Task) {
            return;
        }

        // Check if status field has changed
        if (!$args->hasChangedField('status')) {
            return;
        }

        $oldStatus = $args->getOldValue('status');
        $newStatus = $args->getNewValue('status');

        // Validate the transition
        if (!$this->taskService->isValidTransition($oldStatus, $newStatus)) {
            throw new \InvalidArgumentException(
                sprintf(
                    'Invalid task status transition from "%s" to "%s". Allowed transitions: %s',
                    $oldStatus,
                    $newStatus,
                    implode(', ', $this->taskService->getAllowedTransitions($oldStatus))
                )
            );
        }
    }
}
