<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Migration: Create task_contexts join table
 *
 * Creates the task_contexts table for the many-to-many relationship
 * between tasks and contexts, enabling GTD contextual filtering.
 */
final class Version005CreateTaskContextsTable extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create task_contexts join table for task-context associations';
    }

    public function up(Schema $schema): void
    {
        // Create task_contexts join table for PostgreSQL
        $this->addSql('
            CREATE TABLE task_contexts (
                task_id CHAR(36) NOT NULL,
                context_id CHAR(36) NOT NULL,
                created_at TIMESTAMP NOT NULL,
                PRIMARY KEY(task_id, context_id)
            )
        ');

        // Create indexes for efficient queries
        $this->addSql('CREATE INDEX idx_task_context_task ON task_contexts (task_id)');
        $this->addSql('CREATE INDEX idx_task_context_context ON task_contexts (context_id)');

        // Add foreign key constraint to tasks table
        $this->addSql('
            ALTER TABLE task_contexts
            ADD CONSTRAINT fk_task_context_task
            FOREIGN KEY (task_id) REFERENCES tasks(id)
            ON DELETE CASCADE
        ');

        // Add foreign key constraint to contexts table
        $this->addSql('
            ALTER TABLE task_contexts
            ADD CONSTRAINT fk_task_context_context
            FOREIGN KEY (context_id) REFERENCES contexts(id)
            ON DELETE CASCADE
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE task_contexts');
    }
}
