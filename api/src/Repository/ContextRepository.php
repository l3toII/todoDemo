<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Context;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<Context>
 */
class ContextRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Context::class);
    }

    public function save(Context $context, bool $flush = true): void
    {
        $this->getEntityManager()->persist($context);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(Context $context, bool $flush = true): void
    {
        $this->getEntityManager()->remove($context);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function findById(Uuid $id): ?Context
    {
        return $this->find($id);
    }

    /**
     * Find all contexts available to a user (user's own + system defaults)
     *
     * @return Context[]
     */
    public function findAllForUser(User $user): array
    {
        return $this->createQueryBuilder('c')
            ->where('c.user = :user OR c.user IS NULL')
            ->andWhere('c.status = :status')
            ->setParameter('user', $user)
            ->setParameter('status', Context::STATUS_ACTIVE)
            ->orderBy('c.isDefault', 'DESC')
            ->addOrderBy('c.position', 'ASC')
            ->addOrderBy('c.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find only system default contexts
     *
     * @return Context[]
     */
    public function findDefaults(): array
    {
        return $this->createQueryBuilder('c')
            ->where('c.isDefault = :isDefault')
            ->andWhere('c.user IS NULL')
            ->setParameter('isDefault', true)
            ->orderBy('c.position', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find only user's custom contexts
     *
     * @return Context[]
     */
    public function findCustomByUser(User $user): array
    {
        return $this->createQueryBuilder('c')
            ->where('c.user = :user')
            ->andWhere('c.status = :status')
            ->setParameter('user', $user)
            ->setParameter('status', Context::STATUS_ACTIVE)
            ->orderBy('c.position', 'ASC')
            ->addOrderBy('c.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find a context by name for a specific user (includes defaults)
     */
    public function findByNameForUser(string $name, User $user): ?Context
    {
        return $this->createQueryBuilder('c')
            ->where('c.name = :name')
            ->andWhere('c.user = :user OR c.user IS NULL')
            ->setParameter('name', $name)
            ->setParameter('user', $user)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Check if a context name is available for a user
     */
    public function isNameAvailable(string $name, User $user, ?Uuid $excludeId = null): bool
    {
        $qb = $this->createQueryBuilder('c')
            ->select('COUNT(c.id)')
            ->where('c.name = :name')
            ->andWhere('c.user = :user OR c.user IS NULL')
            ->setParameter('name', $name)
            ->setParameter('user', $user);

        if ($excludeId !== null) {
            $qb->andWhere('c.id != :excludeId')
               ->setParameter('excludeId', $excludeId);
        }

        return (int) $qb->getQuery()->getSingleScalarResult() === 0;
    }

    /**
     * Find archived contexts for a user
     *
     * @return Context[]
     */
    public function findArchivedByUser(User $user): array
    {
        return $this->createQueryBuilder('c')
            ->where('c.user = :user')
            ->andWhere('c.status = :status')
            ->setParameter('user', $user)
            ->setParameter('status', Context::STATUS_ARCHIVED)
            ->orderBy('c.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Count contexts by user
     */
    public function countByUser(User $user): int
    {
        return (int) $this->createQueryBuilder('c')
            ->select('COUNT(c.id)')
            ->where('c.user = :user')
            ->andWhere('c.status = :status')
            ->setParameter('user', $user)
            ->setParameter('status', Context::STATUS_ACTIVE)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Get maximum position for user's contexts
     */
    public function getMaxPositionByUser(User $user): int
    {
        $result = $this->createQueryBuilder('c')
            ->select('MAX(c.position)')
            ->where('c.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleScalarResult();

        return $result !== null ? (int) $result : 0;
    }
}
