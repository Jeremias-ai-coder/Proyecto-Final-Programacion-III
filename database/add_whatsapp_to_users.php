<?php
require_once __DIR__ . '/../src/bootstrap.php';

use Illuminate\Database\Capsule\Manager as Capsule;

try {
    // Verificar si la columna 'phone' ya existe
    $columnsPhone = Capsule::connection()->select("SHOW COLUMNS FROM users LIKE 'phone'");
    if (empty($columnsPhone)) {
        Capsule::connection()->statement("
            ALTER TABLE users ADD COLUMN phone VARCHAR(30) DEFAULT NULL;
        ");
        echo "Columna 'phone' añadida exitosamente.\n";
    } else {
        echo "La columna 'phone' ya existe.\n";
    }

    // Verificar si la columna 'whatsapp_notifications' ya existe
    $columnsWhatsApp = Capsule::connection()->select("SHOW COLUMNS FROM users LIKE 'whatsapp_notifications'");
    if (empty($columnsWhatsApp)) {
        Capsule::connection()->statement("
            ALTER TABLE users ADD COLUMN whatsapp_notifications TINYINT(1) NOT NULL DEFAULT 1;
        ");
        echo "Columna 'whatsapp_notifications' añadida exitosamente.\n";
    } else {
        echo "La columna 'whatsapp_notifications' ya existe.\n";
    }
} catch (Exception $e) {
    echo "Error al modificar la tabla 'users': " . $e->getMessage() . "\n";
}
