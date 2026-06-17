<?php
require_once __DIR__ . '/../src/bootstrap.php';

use Illuminate\Database\Capsule\Manager as Capsule;

try {
    Capsule::connection()->statement("
        CREATE TABLE IF NOT EXISTS business_staff (
            id INT AUTO_INCREMENT PRIMARY KEY,
            business_id INT NOT NULL,
            user_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY uq_business_user (business_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "Tabla 'business_staff' creada o ya existía con éxito.\n";
    exit(0);
} catch (Exception $e) {
    echo "Error al crear la tabla 'business_staff': " . $e->getMessage() . "\n";
    exit(1);
}
