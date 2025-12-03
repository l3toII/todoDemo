<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Project;
use App\Entity\Task;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<Project>
 */
class ProjectRepository extends ServiceEntityRepository
{
    // DQL query conditions as constants to avoid duplication
    private const WHERE_USER_EQUALS = 'p.user = :user';
    private const WHERE_STATUS_EQUALS = 'p.status = :status';

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Project::class);
    }

    public function save(Project $project, bool $flush = true): void
    {
        $this->getEntityManager()->persist($project);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(Project $project, bool $flush = true): void
    {
        $this->getEntityManager()->remove($project);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function findById(Uuid $id): ?Project
    {
        return $this->find($id);
    }

    /**
     * Find all projects for a user
     *
     * @return Project[]
     */
    public function findAllByUser(User $user): array
    {
        return $this->createQueryBuilder('p')
            ->where(self::WHERE_USER_EQUALS)
            ->setParameter('user', $user)
            ->orderBy('p.position', 'ASC')
            ->addOrderBy('p.title', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find active projects for a user
     *
     * @return Project[]
     */
    public function findActiveByUser(User $user): array
    {
        return $this->createQueryBuilder('p')
            ->where(self::WHERE_USER_EQUALS)
            ->andWhere(self::WHERE_STATUS_EQUALS)
            ->setParameter('user', $user)
            ->setParameter('status', Project::STATUS_ACTIVE)
            ->orderBy('p.position', 'ASC')
            ->addOrderBy('p.title', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find projects by status for a user
     *
     * @return Project[]
     */
    public function findByStatus(User $user, string $status): array
    {
        return $this->createQueryBuilder('p')
            ->where(self::WHERE_USER_EQUALS)
            ->andWhere(self::WHERE_STATUS_EQUALS)
            ->setParameter('user', $user)
            ->setParameter('status', $status)
            ->orderBy('p.position', 'ASC')
            ->addOrderBy('p.title', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Count projects by user
     */
    public function countByUser(User $user): int
    {
        return (int) $this->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->where(self::WHERE_USER_EQUALS)
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Count active projects by user
     */
    public function countActiveByUser(User $user): int
    {
        return (int) $this->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->where(self::WHERE_USER_EQUALS)
            ->andWhere(self::WHERE_STATUS_EQUALS)
            ->setParameter('user', $user)
            ->setParameter('status', Project::STATUS_ACTIVE)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Get maximum position for user's projects
     */
    public function getMaxPositionByUser(User $user): int
    {
        $result = $this->createQueryBuilder('p')
            ->select('MAX(p.position)')
            ->where(self::WHERE_USER_EQUALS)
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleScalarResult();

        return $result !== null ? (int) $result : 0;
    }

    /**
     * Find active projects without a next action task (FR-018)
     * Projects that need attention because they have no defined next action
     *
     * @return Project[]
     */
    public function findWithoutNextAction(User $user): array
    {
        // Subquery: projects that have at least one next_action task
        $subQuery = $this->getEntityManager()->createQueryBuilder()
            ->select('IDENTITY(t.project)')
            ->from(Task::class, 't')
            ->where('t.project IS NOT NULL')
            ->andWhere('t.status = :nextActionStatus')
            ->getDQL();

        return $this->createQueryBuilder('p')
            ->where(self::WHERE_USER_EQUALS)
            ->andWhere(self::WHERE_STATUS_EQUALS)
            ->andWhere('p.id NOT IN (' . $subQuery . ')')
            ->setParameter('user', $user)
            ->setParameter('status', Project::STATUS_ACTIVE)
            ->setParameter('nextActionStatus', Task::STATUS_NEXT_ACTION)
            ->orderBy('p.position', 'ASC')
            ->addOrderBy('p.title', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find projects due for review (review_date <= today)
     *
     * @return Project[]
     */
    public function findDueForReview(User $user): array
    {
        return $this->createQueryBuilder('p')
            ->where(self::WHERE_USER_EQUALS)
            ->andWhere(self::WHERE_STATUS_EQUALS)
            ->andWhere('p.reviewDate IS NOT NULL')
            ->andWhere('p.reviewDate <= :today')
            ->setParameter('user', $user)
            ->setParameter('status', Project::STATUS_ACTIVE)
            ->setParameter('today', new \DateTimeImmutable('today'))
            ->orderBy('p.reviewDate', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
