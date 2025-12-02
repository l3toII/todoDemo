<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Task;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<Task>
 */
class TaskRepository extends ServiceEntityRepository
{
    private const EXCLUDED_STATUSES = [Task::STATUS_COMPLETED, Task::STATUS_DELETED];

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
    // Core Query Methods
    // =========================================================================

    /**
     * Find all inbox tasks for a user
     *
     * @return Task[]
     */
    public function findInboxByUser(User $user): array
    {
        return $this->findByUserAndStatus($user, Task::STATUS_INBOX);
    }

    /**
     * Count inbox tasks for a user
     */
    public function countInboxByUser(User $user): int
    {
        return (int) $this->createUserQueryBuilder($user)
            ->select('COUNT(t.id)')
            ->andWhere('t.status = :status')
            ->setParameter('status', Task::STATUS_INBOX)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Find tasks by user and status
     *
     * @return Task[]
     */
    public function findByUserAndStatus(User $user, string $status): array
    {
        return $this->createUserQueryBuilder($user)
            ->andWhere('t.status = :status')
            ->setParameter('status', $status)
            ->orderBy('t.position', 'ASC')
            ->addOrderBy('t.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find all non-deleted tasks for a user
     *
     * @return Task[]
     */
    public function findAllActiveByUser(User $user): array
    {
        return $this->createUserQueryBuilder($user)
            ->andWhere('t.status != :deleted')
            ->setParameter('deleted', Task::STATUS_DELETED)
            ->orderBy('t.position', 'ASC')
            ->addOrderBy('t.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find all completed tasks for a user
     *
     * @return Task[]
     */
    public function findCompletedByUser(User $user, ?int $limit = null): array
    {
        $qb = $this->createUserQueryBuilder($user)
            ->andWhere('t.status = :status')
            ->setParameter('status', Task::STATUS_COMPLETED)
            ->orderBy('t.completedAt', 'DESC');

        if ($limit !== null) {
            $qb->setMaxResults($limit);
        }

        return $qb->getQuery()->getResult();
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
        return $this->createActiveTasksQueryBuilder($user)
            ->andWhere('t.dueDate < :today')
            ->setParameter('today', new \DateTimeImmutable('today'))
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
        return $this->createActiveTasksQueryBuilder($user)
            ->andWhere('t.dueDate = :today')
            ->setParameter('today', new \DateTimeImmutable('today'))
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
        return $this->createActiveTasksQueryBuilder($user)
            ->andWhere('t.dueDate >= :startDate')
            ->andWhere('t.dueDate <= :endDate')
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->orderBy('t.dueDate', 'ASC')
            ->addOrderBy('t.dueTime', 'ASC')
            ->getQuery()
            ->getResult();
    }

    // =========================================================================
    // Project Queries
    // =========================================================================

    /**
     * Find tasks by project (excludes deleted)
     *
     * @return Task[]
     */
    public function findByProject(object $project): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.project = :project')
            ->andWhere('t.status != :deleted')
            ->setParameter('project', $project)
            ->setParameter('deleted', Task::STATUS_DELETED)
            ->orderBy('t.position', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find next action for a project
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
    // Sync & Statistics
    // =========================================================================

    /**
     * Find tasks modified since a given date for sync
     *
     * @return Task[]
     */
    public function findModifiedSince(User $user, \DateTimeImmutable $since): array
    {
        return $this->createUserQueryBuilder($user)
            ->andWhere('t.updatedAt > :since')
            ->setParameter('since', $since)
            ->orderBy('t.updatedAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Count tasks by status for a user
     *
     * @return array<string, int>
     */
    public function countByStatusForUser(User $user): array
    {
        $results = $this->createUserQueryBuilder($user)
            ->select('t.status, COUNT(t.id) as count')
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
        return (int) $this->createUserQueryBuilder($user)
            ->select('COUNT(t.id)')
            ->andWhere('t.status = :status')
            ->andWhere('t.completedAt >= :startDate')
            ->andWhere('t.completedAt <= :endDate')
            ->setParameter('status', Task::STATUS_COMPLETED)
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Get the maximum position for a user's tasks in a given status
     */
    public function getMaxPositionByUserAndStatus(User $user, string $status): int
    {
        $result = $this->createUserQueryBuilder($user)
            ->select('MAX(t.position)')
            ->andWhere('t.status = :status')
            ->setParameter('status', $status)
            ->getQuery()
            ->getSingleScalarResult();

        return $result !== null ? (int) $result : 0;
    }

    // =========================================================================
    // Private Query Builder Helpers
    // =========================================================================

    private function createUserQueryBuilder(User $user): QueryBuilder
    {
        return $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->setParameter('user', $user);
    }

    private function createActiveTasksQueryBuilder(User $user): QueryBuilder
    {
        return $this->createUserQueryBuilder($user)
            ->andWhere('t.status NOT IN (:excludedStatuses)')
            ->setParameter('excludedStatuses', self::EXCLUDED_STATUSES);
    }
}
