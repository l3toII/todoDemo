<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Add verification and password reset token fields to users table
 */
final class Version20251128124106 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add verification and password reset token fields to users table';
    }

    public function up(Schema $schema): void
    {
        // Add verification and password reset token fields (PostgreSQL)
        $this->addSql('ALTER TABLE users ADD verification_token VARCHAR(64) DEFAULT NULL');
        $this->addSql('ALTER TABLE users ADD verification_token_expires_at TIMESTAMP DEFAULT NULL');
        $this->addSql('ALTER TABLE users ADD password_reset_token VARCHAR(64) DEFAULT NULL');
        $this->addSql('ALTER TABLE users ADD password_reset_token_expires_at TIMESTAMP DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // Remove verification and password reset token fields
        $this->addSql('ALTER TABLE users DROP COLUMN verification_token');
        $this->addSql('ALTER TABLE users DROP COLUMN verification_token_expires_at');
        $this->addSql('ALTER TABLE users DROP COLUMN password_reset_token');
        $this->addSql('ALTER TABLE users DROP COLUMN password_reset_token_expires_at');
    }
}
