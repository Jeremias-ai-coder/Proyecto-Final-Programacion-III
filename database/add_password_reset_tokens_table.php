<?php
require_once __DIR__ . '/../src/bootstrap.php';

use Illuminate\Database\Capsule\Manager as Capsule;

try {
    Capsule::connection()->statement("
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(150) NOT NULL,
            token VARCHAR(64) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_email (email),
            UNIQUE KEY uq_token (token)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "Tabla 'password_reset_tokens' creada o ya existía con éxito.\n";
    exit(0);
} catch (Exception $e) {
    echo "Error al crear la tabla 'password_reset_tokens': " . $e->getMessage() . "\n";
    exit(1);
}
