-- GTD App Database Initialization
-- This file is automatically executed when the database container starts for the first time

-- Ensure utf8mb4 charset for emoji support
ALTER DATABASE gtd_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant privileges
GRANT ALL PRIVILEGES ON gtd_app.* TO 'gtd'@'%';
FLUSH PRIVILEGES;

-- Create health check table
CREATE TABLE IF NOT EXISTS health_check (
    id INT PRIMARY KEY AUTO_INCREMENT,
    status VARCHAR(10) DEFAULT 'ok',
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO health_check (status) VALUES ('ok');
