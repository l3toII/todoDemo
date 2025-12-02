<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Migration: Create projects table (Stub for P2)
 *
 * Creates a minimal projects table to satisfy the Task->Project relation.
 * Full project features will be implemented in P5: Project Management.
 */
final class Version003CreateProjectsTable extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create projects table (stub for Task relation)';
    }

    public function up(Schema $schema): void
    {
        // Create projects table for PostgreSQL
        $this->addSql('
            CREATE TABLE projects (
                id CHAR(36) NOT NULL,
                user_id CHAR(36) NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                PRIMARY KEY(id)
            )
        ');

        // Create indexes
        $this->addSql('CREATE INDEX idx_project_user ON projects (user_id)');

        // Add foreign key constraint to users table
        $this->addSql('
            ALTER TABLE projects
            ADD CONSTRAINT fk_project_user
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE projects');
    }
}
