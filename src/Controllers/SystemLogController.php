<?php

namespace App\Controllers;

class SystemLogController
{
    public function handle($route, $method, $input)
    {
        // Validar permisos: sólo administrador
        $userRole = $_SESSION['user_role'] ?? null;
        if ($userRole !== 'administrator') {
            jsonResponse(['message' => 'No autorizado'], 403);
        }

        if ($method === 'GET') {
            $logFile = __DIR__ . '/../../logs/app.log';
            $mailLogFile = __DIR__ . '/../../storage/logs/mail.log';

            $appLogs = [];
            if (file_exists($logFile)) {
                $lines = file($logFile);
                // Obtener últimas 150 líneas
                $appLogs = array_slice($lines, -150);
            } else {
                $appLogs = ["El archivo logs/app.log no existe aún o está vacío."];
            }

            $mailLogs = [];
            if (file_exists($mailLogFile)) {
                $lines = file($mailLogFile);
                // Obtener últimas 150 líneas
                $mailLogs = array_slice($lines, -150);
            } else {
                $mailLogs = ["El archivo storage/logs/mail.log no existe aún o está vacío."];
            }

            jsonResponse([
                'app_logs' => array_map('trim', $appLogs),
                'mail_logs' => array_map('trim', $mailLogs)
            ]);
        }
    }
}
