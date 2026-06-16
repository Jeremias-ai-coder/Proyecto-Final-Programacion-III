<?php
require_once __DIR__ . '/../src/bootstrap.php';

use Illuminate\Database\Capsule\Manager as Capsule;

try {
    // 1. Crear tabla address_cache
    Capsule::connection()->statement("
        CREATE TABLE IF NOT EXISTS address_cache (
            id INT AUTO_INCREMENT PRIMARY KEY,
            address VARCHAR(255) NOT NULL UNIQUE,
            latitude DECIMAL(10, 8) NOT NULL,
            longitude DECIMAL(11, 8) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "Tabla 'address_cache' creada o ya existía.\n";

    // 2. Crear tabla mail_queue
    Capsule::connection()->statement("
        CREATE TABLE IF NOT EXISTS mail_queue (
            id INT AUTO_INCREMENT PRIMARY KEY,
            recipient_email VARCHAR(150) NOT NULL,
            recipient_name VARCHAR(120) NOT NULL,
            subject VARCHAR(200) NOT NULL,
            body TEXT NOT NULL,
            status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
            attempts INT NOT NULL DEFAULT 0,
            error_message TEXT NULL DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "Tabla 'mail_queue' creada o ya existía.\n";

} catch (Exception $e) {
    echo "Error al actualizar la base de datos: " . $e->getMessage() . "\n";
    exit(1);
}
