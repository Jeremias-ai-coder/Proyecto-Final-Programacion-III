<?php

namespace App\Controllers;

class SecurityLocksController
{
    public function handle($route, $method, $input)
    {
        $userRole = $_SESSION['user_role'] ?? null;
        if ($userRole !== 'administrator') {
            jsonResponse(['message' => 'No autorizado'], 403);
        }

        $storageDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'turnos_ya_login_locks';

        if ($method === 'GET') {
            $locks = [];
            $now = time();

            if (is_dir($storageDir)) {
                $files = glob($storageDir . DIRECTORY_SEPARATOR . '*.json');
                foreach ($files as $file) {
                    $content = @file_get_contents($file);
                    if ($content) {
                        $data = json_decode($content, true);
                        if ($data) {
                            $filename = basename($file, '.json');
                            
                            $lockedUntil = isset($data['locked_until']) ? intval($data['locked_until']) : 0;
                            $attempts = isset($data['attempts']) ? intval($data['attempts']) : 0;
                            $email = $data['email'] ?? 'Desconocido';
                            $resetTime = isset($data['reset_time']) ? intval($data['reset_time']) : 0;

                            $isLocked = $lockedUntil > $now;
                            $remainingSeconds = $isLocked ? ($lockedUntil - $now) : 0;

                            $locks[] = [
                                'id' => $filename, // MD5 hash
                                'email' => $email,
                                'attempts' => $attempts,
                                'reset_time' => date('Y-m-d H:i:s', $resetTime),
                                'locked_until' => $lockedUntil > 0 ? date('Y-m-d H:i:s', $lockedUntil) : null,
                                'is_locked' => $isLocked,
                                'remaining_seconds' => $remainingSeconds
                            ];
                        }
                    }
                }
            }

            // Ordenar: cuentas bloqueadas primero, luego por intentos descendente
            usort($locks, function($a, $b) {
                if ($a['is_locked'] !== $b['is_locked']) {
                    return $b['is_locked'] <=> $a['is_locked'];
                }
                return $b['attempts'] <=> $a['attempts'];
            });

            jsonResponse($locks);
        }

        if ($method === 'DELETE') {
            $id = $_GET['id'] ?? null;
            if (!$id) {
                jsonResponse(['message' => 'Falta el identificador del bloqueo'], 400);
            }

            // Validar formato MD5 para prevenir Path Traversal
            if (!preg_match('/^[a-f0-9]{32}$/i', $id)) {
                jsonResponse(['message' => 'Identificador de bloqueo inválido'], 400);
            }

            $file = $storageDir . DIRECTORY_SEPARATOR . $id . '.json';
            if (file_exists($file)) {
                if (@unlink($file)) {
                    jsonResponse(['message' => 'Bloqueo de seguridad eliminado. Cuenta reactivada correctamente.']);
                } else {
                    jsonResponse(['message' => 'No se pudo eliminar el archivo de bloqueo del servidor.'], 500);
                }
            } else {
                jsonResponse(['message' => 'El bloqueo especificado no existe o ya ha expirado.'], 404);
            }
        }
    }
}
