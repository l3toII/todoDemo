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
        // Create feature_flags table for PostgreSQL
        $this->addSql('
            CREATE TABLE feature_flags (
                id CHAR(36) NOT NULL,
                name VARCHAR(100) NOT NULL,
                type VARCHAR(20) NOT NULL,
                enabled BOOLEAN NOT NULL DEFAULT FALSE,
                percentage INT NOT NULL DEFAULT 0,
                user_ids JSON DEFAULT NULL,
                description TEXT DEFAULT NULL,
                expires_at TIMESTAMP DEFAULT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                PRIMARY KEY(id)
            )
        ');

        // Create indexes
        $this->addSql('CREATE UNIQUE INDEX UNIQ_FFE2A7365E237E06 ON feature_flags (name)');
        $this->addSql('CREATE INDEX IDX_FFE2A7368CDE5729 ON feature_flags (type)');
        $this->addSql('CREATE INDEX IDX_FFE2A73687CE3177 ON feature_flags (enabled)');

        // Insert some default feature flags for the GTD app
        $this->addSql("
            INSERT INTO feature_flags (id, name, type, enabled, percentage, description, created_at, updated_at)
            VALUES
                (gen_random_uuid()::text, 'offline_mode', 'release', false, 0, 'Enable offline mode with IndexedDB sync', NOW(), NOW()),
                (gen_random_uuid()::text, 'apple_signin', 'release', true, 100, 'Enable Apple Sign-In authentication', NOW(), NOW()),
                (gen_random_uuid()::text, 'weekly_review_reminders', 'release', true, 100, 'Enable weekly review reminder notifications', NOW(), NOW()),
                (gen_random_uuid()::text, 'project_templates', 'experiment', false, 0, 'Enable project templates feature', NOW(), NOW()),
                (gen_random_uuid()::text, 'advanced_analytics', 'experiment', false, 10, 'Enable advanced productivity analytics', NOW(), NOW())
        ");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE feature_flags');
    }
}
