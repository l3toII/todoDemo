<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Migration: Create refresh_tokens table
 *
 * Creates the refresh_tokens table for JWT refresh token rotation.
 * Tokens are hashed before storage for security.
 */
final class Version008CreateRefreshTokensTable extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create refresh_tokens table for JWT token rotation';
    }

    public function up(Schema $schema): void
    {
        // Create refresh_tokens table
        $this->addSql('
            CREATE TABLE refresh_tokens (
                id CHAR(36) NOT NULL COMMENT \'(DC2Type:uuid)\',
                user_id CHAR(36) NOT NULL COMMENT \'(DC2Type:uuid)\',
                token_hash VARCHAR(255) NOT NULL COMMENT \'Hashed refresh token\',
                device_info VARCHAR(255) DEFAULT NULL COMMENT \'Device identifier/user agent\',
                expires_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                revoked_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                PRIMARY KEY(id),
                INDEX idx_refresh_token_user (user_id),
                INDEX idx_refresh_token_hash (token_hash),
                CONSTRAINT FK_refresh_tokens_user
                    FOREIGN KEY (user_id)
                    REFERENCES users (id)
                    ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE refresh_tokens');
    }
}
