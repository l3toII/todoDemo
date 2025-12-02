<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: \App\Repository\TaskRepository::class)]
#[ORM\Table(name: 'tasks')]
#[ORM\Index(name: 'idx_task_user_status', columns: ['user_id', 'status'])]
#[ORM\Index(name: 'idx_task_user_due', columns: ['user_id', 'due_date'])]
#[ORM\Index(name: 'idx_task_project', columns: ['project_id'])]
#[ORM\Index(name: 'idx_task_updated', columns: ['updated_at'])]
#[ORM\HasLifecycleCallbacks]
class Task
{
    // GTD Workflow Statuses
    public const STATUS_INBOX = 'inbox';
    public const STATUS_CLARIFIED = 'clarified';
    public const STATUS_NEXT_ACTION = 'next_action';
    public const STATUS_WAITING_FOR = 'waiting_for';
    public const STATUS_SOMEDAY_MAYBE = 'someday_maybe';
    public const STATUS_REFERENCE = 'reference';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_DELETED = 'deleted';

    public const STATUSES = [
        self::STATUS_INBOX,
        self::STATUS_CLARIFIED,
        self::STATUS_NEXT_ACTION,
        self::STATUS_WAITING_FOR,
        self::STATUS_SOMEDAY_MAYBE,
        self::STATUS_REFERENCE,
        self::STATUS_COMPLETED,
        self::STATUS_DELETED,
    ];

    // Energy Levels
    public const ENERGY_LOW = 'low';
    public const ENERGY_MEDIUM = 'medium';
    public const ENERGY_HIGH = 'high';

    public const ENERGY_LEVELS = [
        self::ENERGY_LOW,
        self::ENERGY_MEDIUM,
        self::ENERGY_HIGH,
    ];

    #[ORM\Id]
    #[ORM\Column(type: 'uuid_string', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\ManyToOne(targetEntity: 'App\Entity\Project')]
    #[ORM\JoinColumn(name: 'project_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?object $project = null;

    #[ORM\Column(type: Types::STRING, length: 500)]
    #[Assert\NotBlank(message: 'Task title is required')]
    #[Assert\Length(max: 500, maxMessage: 'Task title cannot exceed {{ limit }} characters')]
    private string $title;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::STRING, length: 20)]
    #[Assert\Choice(choices: self::STATUSES, message: 'Invalid task status')]
    private string $status = self::STATUS_INBOX;

    #[ORM\Column(type: Types::STRING, length: 10, nullable: true)]
    #[Assert\Choice(choices: self::ENERGY_LEVELS, message: 'Invalid energy level')]
    private ?string $energyLevel = null;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    #[Assert\Positive(message: 'Time estimate must be positive')]
    private ?int $timeEstimate = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $dueDate = null;

    #[ORM\Column(type: Types::TIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $dueTime = null;

    #[ORM\Column(type: Types::INTEGER)]
    private int $position = 0;

    #[ORM\Column(type: Types::INTEGER)]
    #[ORM\Version]
    private int $version = 1;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $completedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $deletedAt = null;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    // =========================================================================
    // Getters and Setters
    // =========================================================================

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function setUser(User $user): self
    {
        $this->user = $user;
        return $this;
    }

    public function getProject(): ?object
    {
        return $this->project;
    }

    public function setProject(?object $project): self
    {
        $this->project = $project;
        return $this;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): self
    {
        $this->title = $title;
        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): self
    {
        $this->notes = $notes;
        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): self
    {
        $this->status = $status;

        // Auto-set completedAt when status changes to completed
        if ($status === self::STATUS_COMPLETED && $this->completedAt === null) {
            $this->completedAt = new \DateTimeImmutable();
        }

        // Auto-set deletedAt when status changes to deleted
        if ($status === self::STATUS_DELETED && $this->deletedAt === null) {
            $this->deletedAt = new \DateTimeImmutable();
        }

        return $this;
    }

    public function getEnergyLevel(): ?string
    {
        return $this->energyLevel;
    }

    public function setEnergyLevel(?string $energyLevel): self
    {
        $this->energyLevel = $energyLevel;
        return $this;
    }

    public function getTimeEstimate(): ?int
    {
        return $this->timeEstimate;
    }

    public function setTimeEstimate(?int $timeEstimate): self
    {
        $this->timeEstimate = $timeEstimate;
        return $this;
    }

    public function getDueDate(): ?\DateTimeImmutable
    {
        return $this->dueDate;
    }

    public function setDueDate(?\DateTimeImmutable $dueDate): self
    {
        $this->dueDate = $dueDate;
        return $this;
    }

    public function getDueTime(): ?\DateTimeImmutable
    {
        return $this->dueTime;
    }

    public function setDueTime(?\DateTimeImmutable $dueTime): self
    {
        $this->dueTime = $dueTime;
        return $this;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): self
    {
        $this->position = $position;
        return $this;
    }

    public function getVersion(): int
    {
        return $this->version;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function getCompletedAt(): ?\DateTimeImmutable
    {
        return $this->completedAt;
    }

    public function setCompletedAt(?\DateTimeImmutable $completedAt): self
    {
        $this->completedAt = $completedAt;
        return $this;
    }

    public function getDeletedAt(): ?\DateTimeImmutable
    {
        return $this->deletedAt;
    }

    public function setDeletedAt(?\DateTimeImmutable $deletedAt): self
    {
        $this->deletedAt = $deletedAt;
        return $this;
    }

    // =========================================================================
    // Status Helper Methods
    // =========================================================================

    public function isInbox(): bool
    {
        return $this->status === self::STATUS_INBOX;
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function isDeleted(): bool
    {
        return $this->status === self::STATUS_DELETED;
    }

    public function isActionable(): bool
    {
        return in_array($this->status, [
            self::STATUS_NEXT_ACTION,
            self::STATUS_WAITING_FOR,
        ], true);
    }

    public function markAsCompleted(): self
    {
        $this->status = self::STATUS_COMPLETED;
        $this->completedAt = new \DateTimeImmutable();
        return $this;
    }

    public function markAsDeleted(): self
    {
        $this->status = self::STATUS_DELETED;
        $this->deletedAt = new \DateTimeImmutable();
        return $this;
    }

    public function restore(): self
    {
        if ($this->status === self::STATUS_DELETED) {
            $this->status = self::STATUS_INBOX;
            $this->deletedAt = null;
        }
        return $this;
    }

    // =========================================================================
    // Due Date Helper Methods
    // =========================================================================

    public function isOverdue(): bool
    {
        if ($this->dueDate === null) {
            return false;
        }

        if ($this->isCompleted() || $this->isDeleted()) {
            return false;
        }

        $today = new \DateTimeImmutable('today');
        return $this->dueDate < $today;
    }

    public function isDueToday(): bool
    {
        if ($this->dueDate === null) {
            return false;
        }

        $today = new \DateTimeImmutable('today');
        return $this->dueDate->format('Y-m-d') === $today->format('Y-m-d');
    }

    public function isDueSoon(int $days = 7): bool
    {
        if ($this->dueDate === null) {
            return false;
        }

        $today = new \DateTimeImmutable('today');
        $threshold = $today->modify("+{$days} days");

        return $this->dueDate >= $today && $this->dueDate <= $threshold;
    }

    // =========================================================================
    // Serialization
    // =========================================================================

    public function toArray(): array
    {
        return [
            'id' => $this->id->toRfc4122(),
            'title' => $this->title,
            'notes' => $this->notes,
            'status' => $this->status,
            'energy_level' => $this->energyLevel,
            'time_estimate' => $this->timeEstimate,
            'due_date' => $this->dueDate?->format('Y-m-d'),
            'due_time' => $this->dueTime?->format('H:i:s'),
            'position' => $this->position,
            'version' => $this->version,
            'project_id' => $this->project?->getId()?->toRfc4122(),
            'created_at' => $this->createdAt->format(\DateTimeInterface::ATOM),
            'updated_at' => $this->updatedAt->format(\DateTimeInterface::ATOM),
            'completed_at' => $this->completedAt?->format(\DateTimeInterface::ATOM),
            'is_overdue' => $this->isOverdue(),
            'is_due_today' => $this->isDueToday(),
        ];
    }
}
