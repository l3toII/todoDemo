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
    private const STATUS_FILTER = 't.status = :status';

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

    /**
     * @return Task[]
     */
    public function findInboxByUser(User $user): array
    {
        return $this->findByUserAndStatus($user, Task::STATUS_INBOX);
    }

    public function countInboxByUser(User $user): int
    {
        return (int) $this->createUserStatusQueryBuilder($user, Task::STATUS_INBOX)
            ->select('COUNT(t.id)')
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * @return Task[]
     */
    public function findByUserAndStatus(User $user, string $status): array
    {
        return $this->createUserStatusQueryBuilder($user, $status)
            ->orderBy('t.position', 'ASC')
            ->addOrderBy('t.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
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
     * @return Task[]
     */
    public function findCompletedByUser(User $user, ?int $limit = null): array
    {
        $qb = $this->createUserStatusQueryBuilder($user, Task::STATUS_COMPLETED)
            ->orderBy('t.completedAt', 'DESC');

        if ($limit !== null) {
            $qb->setMaxResults($limit);
        }

        return $qb->getQuery()->getResult();
    }

    /**
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

    /**
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

    public function findNextActionByProject(object $project): ?Task
    {
        return $this->createQueryBuilder('t')
            ->where('t.project = :project')
            ->andWhere(self::STATUS_FILTER)
            ->setParameter('project', $project)
            ->setParameter('status', Task::STATUS_NEXT_ACTION)
            ->orderBy('t.position', 'ASC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Find all next_action tasks for a project ordered by position
     *
     * @return Task[]
     */
    public function findNextActionsByProject(object $project): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.project = :project')
            ->andWhere(self::STATUS_FILTER)
            ->setParameter('project', $project)
            ->setParameter('status', Task::STATUS_NEXT_ACTION)
            ->orderBy('t.position', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Count all non-deleted tasks for a project
     */
    public function countByProject(object $project): int
    {
        return (int) $this->createQueryBuilder('t')
            ->select('COUNT(t.id)')
            ->where('t.project = :project')
            ->andWhere('t.status != :deleted')
            ->setParameter('project', $project)
            ->setParameter('deleted', Task::STATUS_DELETED)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
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

    public function countCompletedInRange(
        User $user,
        \DateTimeImmutable $startDate,
        \DateTimeImmutable $endDate
    ): int {
        return (int) $this->createUserStatusQueryBuilder($user, Task::STATUS_COMPLETED)
            ->select('COUNT(t.id)')
            ->andWhere('t.completedAt >= :startDate')
            ->andWhere('t.completedAt <= :endDate')
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function getMaxPositionByUserAndStatus(User $user, string $status): int
    {
        $result = $this->createUserStatusQueryBuilder($user, $status)
            ->select('MAX(t.position)')
            ->getQuery()
            ->getSingleScalarResult();

        return $result !== null ? (int) $result : 0;
    }

    private function createUserQueryBuilder(User $user): QueryBuilder
    {
        return $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->setParameter('user', $user);
    }

    private function createUserStatusQueryBuilder(User $user, string $status): QueryBuilder
    {
        return $this->createUserQueryBuilder($user)
            ->andWhere(self::STATUS_FILTER)
            ->setParameter('status', $status);
    }

    private function createActiveTasksQueryBuilder(User $user): QueryBuilder
    {
        return $this->createUserQueryBuilder($user)
            ->andWhere('t.status NOT IN (:excludedStatuses)')
            ->setParameter('excludedStatuses', self::EXCLUDED_STATUSES);
    }
}
