<?php
require_once __DIR__ . '/../src/bootstrap.php';

use Illuminate\Database\Capsule\Manager as Capsule;

try {
    // Verificar si la columna ya existe
    $columns = Capsule::connection()->select("SHOW COLUMNS FROM users LIKE 'email_notifications'");
    if (empty($columns)) {
        Capsule::connection()->statement("
            ALTER TABLE users ADD COLUMN email_notifications TINYINT(1) NOT NULL DEFAULT 1;
        ");
        echo "Columna 'email_notifications' añadida exitosamente a la tabla 'users'.\n";
    } else {
        echo "La columna 'email_notifications' ya existe en la tabla 'users'.\n";
    }
} catch (Exception $e) {
    echo "Error al modificar la tabla 'users': " . $e->getMessage() . "\n";
}
