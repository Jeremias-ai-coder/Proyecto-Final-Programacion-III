<?php
require_once __DIR__ . '/../src/bootstrap.php';

use Illuminate\Database\Capsule\Manager as Capsule;

try {
    Capsule::connection()->statement("
        CREATE TABLE IF NOT EXISTS user_remember_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            selector CHAR(16) NOT NULL UNIQUE,
            hashed_validator CHAR(64) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "Tabla 'user_remember_tokens' creada exitosamente (o ya existía).\n";
} catch (Exception $e) {
    echo "Error al crear la tabla: " . $e->getMessage() . "\n";
}
