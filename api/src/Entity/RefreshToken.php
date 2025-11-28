<?php

namespace App\Entity;

use App\Repository\RefreshTokenRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: RefreshTokenRepository::class)]
#[ORM\Table(name: 'refresh_tokens')]
#[ORM\Index(name: 'idx_refresh_token_user', columns: ['user_id'])]
#[ORM\Index(name: 'idx_refresh_token_hash', columns: ['token_hash'])]
#[ORM\HasLifecycleCallbacks]
class RefreshToken
{
    #[ORM\Id]
    #[ORM\Column(type: 'guid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $tokenHash;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $deviceInfo = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $expiresAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $revokedAt = null;

    public function __construct(User $user, string $tokenHash, \DateTimeInterface $expiresAt)
    {
        $this->id = Uuid::v4();
        $this->user = $user;
        $this->tokenHash = $tokenHash;
        $this->expiresAt = \DateTimeImmutable::createFromInterface($expiresAt);
        $this->createdAt = new \DateTimeImmutable();
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

    public function getTokenHash(): string
    {
        return $this->tokenHash;
    }

    public function getDeviceInfo(): ?string
    {
        return $this->deviceInfo;
    }

    public function setDeviceInfo(?string $deviceInfo): self
    {
        $this->deviceInfo = $deviceInfo;
        return $this;
    }

    public function getExpiresAt(): \DateTimeImmutable
    {
        return $this->expiresAt;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getRevokedAt(): ?\DateTimeImmutable
    {
        return $this->revokedAt;
    }

    public function revoke(): self
    {
        $this->revokedAt = new \DateTimeImmutable();
        return $this;
    }

    // =========================================================================
    // Validation Methods
    // =========================================================================

    public function isExpired(): bool
    {
        return $this->expiresAt < new \DateTimeImmutable();
    }

    public function isRevoked(): bool
    {
        return $this->revokedAt !== null;
    }

    public function isValid(): bool
    {
        return !$this->isExpired() && !$this->isRevoked();
    }

    /**
     * Verify a plain token against the stored hash
     */
    public function verify(string $plainToken): bool
    {
        return hash('sha256', $plainToken) === $this->tokenHash;
    }

    /**
     * Create a hashed token from plain text using SHA-256
     */
    public static function hashToken(string $plainToken): string
    {
        return hash('sha256', $plainToken);
    }

    /**
     * Generate a cryptographically secure random token
     */
    public static function generateToken(): string
    {
        return bin2hex(random_bytes(32));
    }
}
