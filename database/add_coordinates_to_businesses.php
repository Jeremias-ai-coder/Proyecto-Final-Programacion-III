<?php
require_once __DIR__ . '/../src/bootstrap.php';

use Illuminate\Database\Capsule\Manager as Capsule;
use App\Models\Business;

try {
    // 1. Añadir columnas a la tabla businesses
    $columnsLat = Capsule::connection()->select("SHOW COLUMNS FROM businesses LIKE 'latitude'");
    if (empty($columnsLat)) {
        Capsule::connection()->statement("
            ALTER TABLE businesses 
            ADD COLUMN latitude DECIMAL(10, 8) NULL DEFAULT NULL,
            ADD COLUMN longitude DECIMAL(11, 8) NULL DEFAULT NULL;
        ");
        echo "Columnas 'latitude' y 'longitude' añadidas exitosamente a la tabla 'businesses'.\n";
    } else {
        echo "Las columnas de coordenadas ya existen en la tabla 'businesses'.\n";
    }

    // 2. Geocodificar negocios existentes que no tengan coordenadas
    $businesses = Business::whereNull('latitude')->whereNotNull('address')->get();
    if ($businesses->count() > 0) {
        echo "Geocodificando " . $businesses->count() . " negocios existentes...\n";
        foreach ($businesses as $b) {
            $address = $b->address;
            if (empty(trim($address))) continue;

            echo "Geocodificando: '{$b->name}' - Dirección: '{$address}'... ";
            
            // Nominatim requiere User-Agent válido
            $url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" . urlencode($address);
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_USERAGENT, 'TurnosYaApp/1.0 (contact@turnosya.com)');
            curl_setopt($ch, CURLOPT_TIMEOUT, 8);
            
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && !empty($res)) {
                $data = json_decode($res, true);
                if (!empty($data) && isset($data[0]['lat']) && isset($data[0]['lon'])) {
                    $b->latitude = $data[0]['lat'];
                    $b->longitude = $data[0]['lon'];
                    $b->save();
                    echo "OK (Lat: {$b->latitude}, Lon: {$b->longitude})\n";
                } else {
                    echo "No se encontraron coordenadas para esta dirección.\n";
                }
            } else {
                echo "Fallo al conectar con el servicio (HTTP: {$httpCode}).\n";
            }
            
            // Pausa de 1.1s para respetar la limitación de tasa de Nominatim
            usleep(1100000);
        }
    } else {
        echo "No hay negocios existentes que requieran geocodificación.\n";
    }

} catch (Exception $e) {
    echo "Error al modificar la tabla o geocodificar: " . $e->getMessage() . "\n";
}
