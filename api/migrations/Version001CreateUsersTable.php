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
        // Create users table
        $this->addSql('
            CREATE TABLE users (
                id CHAR(36) NOT NULL COMMENT \'(DC2Type:uuid)\',
                email VARCHAR(255) NOT NULL,
                password_hash VARCHAR(255) DEFAULT NULL COMMENT \'Null for Apple Sign-In only users\',
                apple_id VARCHAR(255) DEFAULT NULL COMMENT \'Apple Sign-In identifier\',
                status VARCHAR(30) NOT NULL DEFAULT \'pending_verification\',
                notification_preferences JSON NOT NULL COMMENT \'User notification settings\',
                timezone VARCHAR(50) NOT NULL DEFAULT \'UTC\',
                created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                updated_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                verified_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                last_login_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                PRIMARY KEY(id),
                UNIQUE INDEX UNIQ_1483A5E9E7927C74 (email),
                UNIQUE INDEX UNIQ_1483A5E9A93CA3B7 (apple_id),
                INDEX idx_user_email (email),
                INDEX idx_user_apple_id (apple_id),
                INDEX idx_user_status (status)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');

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
