<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Migration: Create contexts table
 *
 * Creates the contexts table for GTD contextual organization.
 * Contexts can be system defaults (user_id = NULL) or user-defined.
 * Default contexts are seeded: @Office, @Home, @Phone, @Errands, @Computer, @Waiting
 */
final class Version002CreateContextsTable extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create contexts table with default GTD contexts';
    }

    public function up(Schema $schema): void
    {
        // Create contexts table for PostgreSQL
        $this->addSql('
            CREATE TABLE contexts (
                id CHAR(36) NOT NULL,
                user_id CHAR(36) DEFAULT NULL,
                name VARCHAR(50) NOT NULL,
                icon VARCHAR(50) DEFAULT NULL,
                color VARCHAR(7) DEFAULT NULL,
                is_default BOOLEAN NOT NULL DEFAULT FALSE,
                status VARCHAR(20) NOT NULL DEFAULT \'active\',
                position INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                PRIMARY KEY(id)
            )
        ');

        // Create indexes for performance
        $this->addSql('CREATE INDEX idx_context_user ON contexts (user_id)');
        $this->addSql('CREATE UNIQUE INDEX idx_context_name ON contexts (user_id, name)');

        // Add foreign key constraint to users table (nullable for default contexts)
        $this->addSql('
            ALTER TABLE contexts
            ADD CONSTRAINT fk_context_user
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE
        ');

        // Add check constraint for status enum
        $this->addSql('
            ALTER TABLE contexts
            ADD CONSTRAINT check_context_status
            CHECK (status IN (
                \'active\',
                \'archived\'
            ))
        ');

        // Seed default contexts (user_id = NULL means system-wide default)
        $now = date('Y-m-d H:i:s');

        // Generate UUIDs for default contexts
        $defaults = [
            ['name' => '@Office', 'icon' => 'building', 'color' => '#3498db', 'position' => 0],
            ['name' => '@Home', 'icon' => 'home', 'color' => '#2ecc71', 'position' => 1],
            ['name' => '@Phone', 'icon' => 'phone', 'color' => '#9b59b6', 'position' => 2],
            ['name' => '@Errands', 'icon' => 'shopping-cart', 'color' => '#e67e22', 'position' => 3],
            ['name' => '@Computer', 'icon' => 'laptop', 'color' => '#1abc9c', 'position' => 4],
            ['name' => '@Waiting', 'icon' => 'clock', 'color' => '#95a5a6', 'position' => 5],
        ];

        foreach ($defaults as $context) {
            $uuid = $this->generateUuid();
            $this->addSql("
                INSERT INTO contexts (id, user_id, name, icon, color, is_default, status, position, created_at, updated_at)
                VALUES ('{$uuid}', NULL, '{$context['name']}', '{$context['icon']}', '{$context['color']}', TRUE, 'active', {$context['position']}, '{$now}', '{$now}')
            ");
        }
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE contexts');
    }

    /**
     * Generate a UUID v4 string
     */
    private function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // Version 4
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // Variant RFC 4122

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
