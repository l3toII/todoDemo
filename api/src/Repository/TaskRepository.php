<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Task;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<Task>
 */
class TaskRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Task::class);
    }

    public function save(Task $task, bool $flush = true): void
    {
        $this->getEntityManager()->persist($task);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(Task $task, bool $flush = true): void
    {
        $this->getEntityManager()->remove($task);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function findById(Uuid $id): ?Task
    {
        return $this->find($id);
    }

    // =========================================================================
    // Inbox Queries (FR-007)
    // =========================================================================

    /**
     * Find all inbox tasks for a user, ordered by position then creation date
     *
     * @return Task[]
     */
    public function findInboxByUser(User $user): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->andWhere('t.status = :status')
            ->setParameter('user', $user)
            ->setParameter('status', Task::STATUS_INBOX)
            ->orderBy('t.position', 'ASC')
            ->addOrderBy('t.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Count inbox tasks for a user
     */
    public function countInboxByUser(User $user): int
    {
        return (int) $this->createQueryBuilder('t')
            ->select('COUNT(t.id)')
            ->where('t.user = :user')
            ->andWhere('t.status = :status')
            ->setParameter('user', $user)
            ->setParameter('status', Task::STATUS_INBOX)
            ->getQuery()
            ->getSingleScalarResult();
    }

    // =========================================================================
    // Status-based Queries
    // =========================================================================

    /**
     * Find tasks by user and status
     *
     * @return Task[]
     */
    public function findByUserAndStatus(User $user, string $status): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->andWhere('t.status = :status')
            ->setParameter('user', $user)
            ->setParameter('status', $status)
            ->orderBy('t.position', 'ASC')
            ->addOrderBy('t.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find all next actions for a user
     *
     * @return Task[]
     */
    public function findNextActionsByUser(User $user): array
    {
        return $this->findByUserAndStatus($user, Task::STATUS_NEXT_ACTION);
    }

    /**
     * Find all waiting for tasks for a user
     *
     * @return Task[]
     */
    public function findWaitingForByUser(User $user): array
    {
        return $this->findByUserAndStatus($user, Task::STATUS_WAITING_FOR);
    }

    /**
     * Find all someday/maybe tasks for a user
     *
     * @return Task[]
     */
    public function findSomedayMaybeByUser(User $user): array
    {
        return $this->findByUserAndStatus($user, Task::STATUS_SOMEDAY_MAYBE);
    }

    /**
     * Find all reference items for a user
     *
     * @return Task[]
     */
    public function findReferenceByUser(User $user): array
    {
        return $this->findByUserAndStatus($user, Task::STATUS_REFERENCE);
    }

    /**
     * Find all completed tasks for a user
     *
     * @return Task[]
     */
    public function findCompletedByUser(User $user, ?int $limit = null): array
    {
        $qb = $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->andWhere('t.status = :status')
            ->setParameter('user', $user)
            ->setParameter('status', Task::STATUS_COMPLETED)
            ->orderBy('t.completedAt', 'DESC');

        if ($limit !== null) {
            $qb->setMaxResults($limit);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Find all deleted (soft-deleted) tasks for a user
     *
     * @return Task[]
     */
    public function findDeletedByUser(User $user): array
    {
        return $this->findByUserAndStatus($user, Task::STATUS_DELETED);
    }

    // =========================================================================
    // Due Date Queries
    // =========================================================================

    /**
     * Find overdue tasks for a user (excludes completed/deleted)
     *
     * @return Task[]
     */
    public function findOverdueByUser(User $user): array
    {
        $today = new \DateTimeImmutable('today');

        return $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->andWhere('t.dueDate < :today')
            ->andWhere('t.status NOT IN (:excludedStatuses)')
            ->setParameter('user', $user)
            ->setParameter('today', $today)
            ->setParameter('excludedStatuses', [Task::STATUS_COMPLETED, Task::STATUS_DELETED])
            ->orderBy('t.dueDate', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find tasks due today for a user (excludes completed/deleted)
     *
     * @return Task[]
     */
    public function findDueTodayByUser(User $user): array
    {
        $today = new \DateTimeImmutable('today');

        return $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->andWhere('t.dueDate = :today')
            ->andWhere('t.status NOT IN (:excludedStatuses)')
            ->setParameter('user', $user)
            ->setParameter('today', $today)
            ->setParameter('excludedStatuses', [Task::STATUS_COMPLETED, Task::STATUS_DELETED])
            ->orderBy('t.dueTime', 'ASC')
            ->addOrderBy('t.position', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find tasks due within a date range for a user
     *
     * @return Task[]
     */
    public function findDueInRangeByUser(
        User $user,
        \DateTimeImmutable $startDate,
        \DateTimeImmutable $endDate
    ): array {
        return $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->andWhere('t.dueDate >= :startDate')
            ->andWhere('t.dueDate <= :endDate')
            ->andWhere('t.status NOT IN (:excludedStatuses)')
            ->setParameter('user', $user)
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->setParameter('excludedStatuses', [Task::STATUS_COMPLETED, Task::STATUS_DELETED])
            ->orderBy('t.dueDate', 'ASC')
            ->addOrderBy('t.dueTime', 'ASC')
            ->getQuery()
            ->getResult();
    }

    // =========================================================================
    // Project Queries
    // =========================================================================

    /**
     * Find tasks by project
     *
     * @return Task[]
     */
    public function findByProject(object $project): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.project = :project')
            ->andWhere('t.status NOT IN (:excludedStatuses)')
            ->setParameter('project', $project)
            ->setParameter('excludedStatuses', [Task::STATUS_DELETED])
            ->orderBy('t.position', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find next action for a project (first task with next_action status)
     */
    public function findNextActionByProject(object $project): ?Task
    {
        return $this->createQueryBuilder('t')
            ->where('t.project = :project')
            ->andWhere('t.status = :status')
            ->setParameter('project', $project)
            ->setParameter('status', Task::STATUS_NEXT_ACTION)
            ->orderBy('t.position', 'ASC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    // =========================================================================
    // Actionable Tasks Queries
    // =========================================================================

    /**
     * Find all actionable tasks for a user (next_action + waiting_for)
     *
     * @return Task[]
     */
    public function findActionableByUser(User $user): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->andWhere('t.status IN (:statuses)')
            ->setParameter('user', $user)
            ->setParameter('statuses', [Task::STATUS_NEXT_ACTION, Task::STATUS_WAITING_FOR])
            ->orderBy('t.position', 'ASC')
            ->getQuery()
            ->getResult();
    }

    // =========================================================================
    // Sync Queries
    // =========================================================================

    /**
     * Find tasks modified since a given date for sync
     *
     * @return Task[]
     */
    public function findModifiedSince(User $user, \DateTimeImmutable $since): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->andWhere('t.updatedAt > :since')
            ->setParameter('user', $user)
            ->setParameter('since', $since)
            ->orderBy('t.updatedAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    // =========================================================================
    // Statistics Queries
    // =========================================================================

    /**
     * Count tasks by status for a user
     *
     * @return array<string, int>
     */
    public function countByStatusForUser(User $user): array
    {
        $results = $this->createQueryBuilder('t')
            ->select('t.status, COUNT(t.id) as count')
            ->where('t.user = :user')
            ->setParameter('user', $user)
            ->groupBy('t.status')
            ->getQuery()
            ->getResult();

        $counts = [];
        foreach ($results as $result) {
            $counts[$result['status']] = (int) $result['count'];
        }

        return $counts;
    }

    /**
     * Count completed tasks in a date range for a user
     */
    public function countCompletedInRange(
        User $user,
        \DateTimeImmutable $startDate,
        \DateTimeImmutable $endDate
    ): int {
        return (int) $this->createQueryBuilder('t')
            ->select('COUNT(t.id)')
            ->where('t.user = :user')
            ->andWhere('t.status = :status')
            ->andWhere('t.completedAt >= :startDate')
            ->andWhere('t.completedAt <= :endDate')
            ->setParameter('user', $user)
            ->setParameter('status', Task::STATUS_COMPLETED)
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->getQuery()
            ->getSingleScalarResult();
    }

    // =========================================================================
    // Position Management
    // =========================================================================

    /**
     * Get the maximum position for a user's tasks in a given status
     */
    public function getMaxPositionByUserAndStatus(User $user, string $status): int
    {
        $result = $this->createQueryBuilder('t')
            ->select('MAX(t.position)')
            ->where('t.user = :user')
            ->andWhere('t.status = :status')
            ->setParameter('user', $user)
            ->setParameter('status', $status)
            ->getQuery()
            ->getSingleScalarResult();

        return $result !== null ? (int) $result : 0;
    }
}
