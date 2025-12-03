<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Migration: Add full Project fields for P5 - Project Management
 *
 * Extends the stub projects table with all required fields:
 * - Renames 'name' to 'title' for consistency
 * - Adds outcome, status, position, review_date, version, completed_at
 * - Adds composite index for user+status queries
 */
final class Version010AddProjectFields extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add full Project fields for GTD project management (P5)';
    }

    public function up(Schema $schema): void
    {
        // Rename 'name' column to 'title' for consistency with specs
        $this->addSql('ALTER TABLE projects RENAME COLUMN name TO title');

        // Add outcome column (TEXT, nullable) - desired outcome description
        $this->addSql('ALTER TABLE projects ADD COLUMN outcome TEXT DEFAULT NULL');

        // Add status column (VARCHAR, NOT NULL, DEFAULT 'active')
        $this->addSql("ALTER TABLE projects ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'");

        // Add position column (INT, NOT NULL, DEFAULT 0) - sort order
        $this->addSql('ALTER TABLE projects ADD COLUMN position INT NOT NULL DEFAULT 0');

        // Add review_date column (DATE, nullable) - next review date
        $this->addSql('ALTER TABLE projects ADD COLUMN review_date DATE DEFAULT NULL');

        // Add version column (INT, NOT NULL, DEFAULT 1) - optimistic locking
        $this->addSql('ALTER TABLE projects ADD COLUMN version INT NOT NULL DEFAULT 1');

        // Add completed_at column (TIMESTAMP, nullable) - completion date
        $this->addSql('ALTER TABLE projects ADD COLUMN completed_at TIMESTAMP DEFAULT NULL');

        // Drop old single-column index if exists (will be replaced by composite)
        $this->addSql('DROP INDEX IF EXISTS idx_project_user');

        // Add composite index for user + status queries (most common query pattern)
        $this->addSql('CREATE INDEX idx_project_user_status ON projects (user_id, status)');
    }

    public function down(Schema $schema): void
    {
        // Drop the composite index
        $this->addSql('DROP INDEX IF EXISTS idx_project_user_status');

        // Recreate the original single-column index
        $this->addSql('CREATE INDEX idx_project_user ON projects (user_id)');

        // Remove added columns
        $this->addSql('ALTER TABLE projects DROP COLUMN completed_at');
        $this->addSql('ALTER TABLE projects DROP COLUMN version');
        $this->addSql('ALTER TABLE projects DROP COLUMN review_date');
        $this->addSql('ALTER TABLE projects DROP COLUMN position');
        $this->addSql('ALTER TABLE projects DROP COLUMN status');
        $this->addSql('ALTER TABLE projects DROP COLUMN outcome');

        // Rename 'title' back to 'name'
        $this->addSql('ALTER TABLE projects RENAME COLUMN title TO name');
    }
}
