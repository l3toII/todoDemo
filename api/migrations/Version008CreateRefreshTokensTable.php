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
        // Create refresh_tokens table for PostgreSQL
        $this->addSql('
            CREATE TABLE refresh_tokens (
                id CHAR(36) NOT NULL,
                user_id CHAR(36) NOT NULL,
                token_hash VARCHAR(255) NOT NULL,
                device_info VARCHAR(255) DEFAULT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP NOT NULL,
                revoked_at TIMESTAMP DEFAULT NULL,
                PRIMARY KEY(id)
            )
        ');

        // Create indexes
        $this->addSql('CREATE INDEX idx_refresh_token_user ON refresh_tokens (user_id)');
        $this->addSql('CREATE INDEX idx_refresh_token_hash ON refresh_tokens (token_hash)');

        // Add foreign key constraint
        $this->addSql('
            ALTER TABLE refresh_tokens
            ADD CONSTRAINT FK_refresh_tokens_user
            FOREIGN KEY (user_id)
            REFERENCES users (id)
            ON DELETE CASCADE
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE refresh_tokens');
    }
}
