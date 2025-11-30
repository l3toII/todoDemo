<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Migration: Create users table
 *
 * Creates the users table with authentication fields, status tracking,
 * and support for both email/password and Apple Sign-In authentication.
 */
final class Version001CreateUsersTable extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create users table with authentication and profile fields';
    }

    public function up(Schema $schema): void
    {
        // Create users table for PostgreSQL
        $this->addSql('
            CREATE TABLE users (
                id CHAR(36) NOT NULL,
                email VARCHAR(255) NOT NULL,
                password_hash VARCHAR(255) DEFAULT NULL,
                apple_id VARCHAR(255) DEFAULT NULL,
                status VARCHAR(30) NOT NULL DEFAULT \'pending_verification\',
                notification_preferences JSON NOT NULL,
                timezone VARCHAR(50) NOT NULL DEFAULT \'UTC\',
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                verified_at TIMESTAMP DEFAULT NULL,
                last_login_at TIMESTAMP DEFAULT NULL,
                PRIMARY KEY(id)
            )
        ');

        // Create indexes
        $this->addSql('CREATE UNIQUE INDEX UNIQ_1483A5E9E7927C74 ON users (email)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_1483A5E9A93CA3B7 ON users (apple_id)');
        $this->addSql('CREATE INDEX idx_user_email ON users (email)');
        $this->addSql('CREATE INDEX idx_user_apple_id ON users (apple_id)');
        $this->addSql('CREATE INDEX idx_user_status ON users (status)');

        // Add check constraint for status enum
        $this->addSql('
            ALTER TABLE users
            ADD CONSTRAINT check_user_status
            CHECK (status IN (
                \'pending_verification\',
                \'active\',
                \'suspended\',
                \'deleted\'
            ))
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE users');
    }
}
