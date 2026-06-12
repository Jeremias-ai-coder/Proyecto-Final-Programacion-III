<?php
require_once __DIR__ . '/../src/bootstrap.php';

use Illuminate\Database\Capsule\Manager as Capsule;

try {
    Capsule::connection()->statement("
        CREATE TABLE IF NOT EXISTS reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            appointment_id INT NOT NULL UNIQUE,
            rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "Tabla 'reviews' creada exitosamente (o ya existía).\n";
} catch (Exception $e) {
    echo "Error al crear la tabla: " . $e->getMessage() . "\n";
}
