<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Migration: Create tasks table
 *
 * Creates the tasks table with GTD workflow statuses, energy levels,
 * time estimates, due dates, and position for ordering.
 */
final class Version004CreateTasksTable extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create tasks table with GTD workflow support';
    }

    public function up(Schema $schema): void
    {
        // Create tasks table for PostgreSQL
        $this->addSql('
            CREATE TABLE tasks (
                id CHAR(36) NOT NULL,
                user_id CHAR(36) NOT NULL,
                project_id CHAR(36) DEFAULT NULL,
                title VARCHAR(500) NOT NULL,
                notes TEXT DEFAULT NULL,
                status VARCHAR(20) NOT NULL DEFAULT \'inbox\',
                energy_level VARCHAR(10) DEFAULT NULL,
                time_estimate INTEGER DEFAULT NULL,
                due_date DATE DEFAULT NULL,
                due_time TIME DEFAULT NULL,
                position INTEGER NOT NULL DEFAULT 0,
                version INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                completed_at TIMESTAMP DEFAULT NULL,
                deleted_at TIMESTAMP DEFAULT NULL,
                PRIMARY KEY(id)
            )
        ');

        // Create indexes for performance
        $this->addSql('CREATE INDEX idx_task_user_status ON tasks (user_id, status)');
        $this->addSql('CREATE INDEX idx_task_user_due ON tasks (user_id, due_date)');
        $this->addSql('CREATE INDEX idx_task_project ON tasks (project_id)');
        $this->addSql('CREATE INDEX idx_task_updated ON tasks (updated_at)');

        // Add foreign key constraint to users table
        $this->addSql('
            ALTER TABLE tasks
            ADD CONSTRAINT fk_task_user
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE
        ');

        // Add check constraint for status enum
        $this->addSql('
            ALTER TABLE tasks
            ADD CONSTRAINT check_task_status
            CHECK (status IN (
                \'inbox\',
                \'clarified\',
                \'next_action\',
                \'waiting_for\',
                \'someday_maybe\',
                \'reference\',
                \'completed\',
                \'deleted\'
            ))
        ');

        // Add check constraint for energy_level enum
        $this->addSql('
            ALTER TABLE tasks
            ADD CONSTRAINT check_task_energy_level
            CHECK (energy_level IS NULL OR energy_level IN (
                \'low\',
                \'medium\',
                \'high\'
            ))
        ');

        // Add check constraint for positive time_estimate
        $this->addSql('
            ALTER TABLE tasks
            ADD CONSTRAINT check_task_time_estimate
            CHECK (time_estimate IS NULL OR time_estimate > 0)
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE tasks');
    }
}
