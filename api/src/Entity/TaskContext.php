<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * TaskContext represents the many-to-many relationship between Tasks and Contexts.
 *
 * This join entity allows tasks to be associated with multiple contexts,
 * enabling GTD-style filtering by location, tool, or situation.
 */
#[ORM\Entity]
#[ORM\Table(name: 'task_contexts')]
class TaskContext
{
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Task::class)]
    #[ORM\JoinColumn(name: 'task_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Task $task;

    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Context::class)]
    #[ORM\JoinColumn(name: 'context_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Context $context;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(Task $task, Context $context)
    {
        $this->task = $task;
        $this->context = $context;
        $this->createdAt = new \DateTimeImmutable();
    }

    // =========================================================================
    // Getters
    // =========================================================================

    public function getTask(): Task
    {
        return $this->task;
    }

    public function getContext(): Context
    {
        return $this->context;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    // =========================================================================
    // Serialization
    // =========================================================================

    public function toArray(): array
    {
        return [
            'task_id' => $this->task->getId()->toRfc4122(),
            'context_id' => $this->context->getId()->toRfc4122(),
            'created_at' => $this->createdAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
