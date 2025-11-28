<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Create feature_flags table for feature flag management
 */
final class Version009CreateFeatureFlagsTable extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create feature_flags table for feature flag management (Constitution XIII)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE feature_flags (
                id CHAR(36) NOT NULL COMMENT \'(DC2Type:uuid)\',
                name VARCHAR(100) NOT NULL,
                type VARCHAR(20) NOT NULL,
                enabled TINYINT(1) NOT NULL DEFAULT 0,
                percentage INT NOT NULL DEFAULT 0,
                user_ids JSON DEFAULT NULL COMMENT \'(DC2Type:json)\',
                description TEXT DEFAULT NULL,
                expires_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                updated_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                PRIMARY KEY(id),
                UNIQUE INDEX UNIQ_FFE2A7365E237E06 (name),
                INDEX IDX_FFE2A7368CDE5729 (type),
                INDEX IDX_FFE2A73687CE3177 (enabled)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');

        // Insert some default feature flags for the GTD app
        $this->addSql("
            INSERT INTO feature_flags (id, name, type, enabled, percentage, description, created_at, updated_at)
            VALUES
                (UUID(), 'offline_mode', 'release', 0, 0, 'Enable offline mode with IndexedDB sync', NOW(), NOW()),
                (UUID(), 'apple_signin', 'release', 1, 100, 'Enable Apple Sign-In authentication', NOW(), NOW()),
                (UUID(), 'weekly_review_reminders', 'release', 1, 100, 'Enable weekly review reminder notifications', NOW(), NOW()),
                (UUID(), 'project_templates', 'experiment', 0, 0, 'Enable project templates feature', NOW(), NOW()),
                (UUID(), 'advanced_analytics', 'experiment', 0, 10, 'Enable advanced productivity analytics', NOW(), NOW())
        ");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE feature_flags');
    }
}
