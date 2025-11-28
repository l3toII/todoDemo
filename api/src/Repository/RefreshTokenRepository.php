<?php

namespace App\Repository;

use App\Entity\RefreshToken;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<RefreshToken>
 */
class RefreshTokenRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, RefreshToken::class);
    }

    public function save(RefreshToken $refreshToken, bool $flush = true): void
    {
        $this->getEntityManager()->persist($refreshToken);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(RefreshToken $refreshToken, bool $flush = true): void
    {
        $this->getEntityManager()->remove($refreshToken);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /**
     * Find a valid (not expired, not revoked) refresh token by its hash
     */
    public function findValidByHash(string $tokenHash): ?RefreshToken
    {
        $qb = $this->createQueryBuilder('rt')
            ->where('rt.tokenHash = :hash')
            ->andWhere('rt.expiresAt > :now')
            ->andWhere('rt.revokedAt IS NULL')
            ->setParameter('hash', $tokenHash)
            ->setParameter('now', new \DateTimeImmutable())
            ->setMaxResults(1);

        return $qb->getQuery()->getOneOrNullResult();
    }

    /**
     * Revoke all refresh tokens for a user
     */
    public function revokeAllForUser(User $user): void
    {
        $qb = $this->createQueryBuilder('rt')
            ->update()
            ->set('rt.revokedAt', ':now')
            ->where('rt.user = :user')
            ->andWhere('rt.revokedAt IS NULL')
            ->setParameter('now', new \DateTimeImmutable())
            ->setParameter('user', $user);

        $qb->getQuery()->execute();
    }

    /**
     * Delete expired tokens (for cleanup jobs)
     */
    public function deleteExpired(): int
    {
        $qb = $this->createQueryBuilder('rt')
            ->delete()
            ->where('rt.expiresAt < :now')
            ->setParameter('now', new \DateTimeImmutable());

        return $qb->getQuery()->execute();
    }

    /**
     * Delete revoked tokens older than a certain date
     */
    public function deleteRevokedOlderThan(\DateTimeInterface $date): int
    {
        $qb = $this->createQueryBuilder('rt')
            ->delete()
            ->where('rt.revokedAt IS NOT NULL')
            ->andWhere('rt.revokedAt < :date')
            ->setParameter('date', $date);

        return $qb->getQuery()->execute();
    }
}
