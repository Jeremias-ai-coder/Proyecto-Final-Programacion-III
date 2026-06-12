<?php

if (session_status() === PHP_SESSION_NONE) {
    // Detectar dinámicamente si la solicitud se realiza a través de HTTPS/SSL
    $isSecure = false;
    if (isset($_SERVER['HTTPS']) && ($_SERVER['HTTPS'] === 'on' || $_SERVER['HTTPS'] === 1)) {
        $isSecure = true;
    } elseif (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
        $isSecure = true;
    }

    // Configurar parámetros seguros para la cookie de sesión
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $isSecure,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);

    session_start();
}

// 1. Control de expiración de sesiones activas (Idle y Absolute Timeout)
if (isset($_SESSION['user_id'])) {
    $expired = false;
    $now = time();

    // Inactividad mayor a 1 hora (3600 segundos)
    if (isset($_SESSION['last_activity']) && ($now - $_SESSION['last_activity'] > 3600)) {
        $expired = true;
    }
    // Tiempo absoluto mayor a 24 horas (86400 segundos) desde la creación
    if (isset($_SESSION['created_time']) && ($now - $_SESSION['created_time'] > 86400)) {
        $expired = true;
    }

    if ($expired) {
        // La sesión ha expirado. Limpiamos las variables locales.
        $_SESSION = [];

        // Validamos si tiene un Remember Me válido para decidir si destruimos la sesión por completo
        // o si permitimos que el bloque posterior de auto-login la restaure de forma segura.
        $has_valid_remember = false;
        if (isset($_COOKIE['remember_me'])) {
            $cookieValue = $_COOKIE['remember_me'];
            $parts = explode(':', $cookieValue, 2);
            if (count($parts) === 2) {
                $selector = $parts[0];
                $validator = $parts[1];
                try {
                    $tokenModel = \App\Models\UserRememberToken::where('selector', $selector)
                        ->where('expires_at', '>', date('Y-m-d H:i:s'))
                        ->first();
                    if ($tokenModel && hash_equals($tokenModel->hashed_validator, hash('sha256', $validator))) {
                        $has_valid_remember = true;
                    }
                } catch (\Exception $e) {
                    // Ignorar errores de base de datos durante la comprobación preventiva
                }
            }
        }

        if (!$has_valid_remember) {
            // No hay remember_me o no es válido: destruir la sesión en el servidor y borrar cookie de sesión
            if (ini_get("session.use_cookies")) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', $now - 42000,
                    $params["path"], $params["domain"],
                    $params["secure"], $params["httponly"]
                );
            }
            session_destroy();
        }
    } else {
        // Si no ha expirado, actualizamos el tiempo de última actividad
        $_SESSION['last_activity'] = $now;
    }
}

// 2. Auto-Login a través del token de "Recordarme" (Remember Me)
if (!isset($_SESSION['user_id']) && isset($_COOKIE['remember_me'])) {
    $cookieValue = $_COOKIE['remember_me'];
    $parts = explode(':', $cookieValue, 2);
    if (count($parts) === 2) {
        $selector = $parts[0];
        $validator = $parts[1];

        try {
            $tokenModel = \App\Models\UserRememberToken::where('selector', $selector)
                ->where('expires_at', '>', date('Y-m-d H:i:s'))
                ->first();

            if ($tokenModel && hash_equals($tokenModel->hashed_validator, hash('sha256', $validator))) {
                // El validador coincide de forma segura. Buscamos el usuario asociado.
                $user = \App\Models\User::find($tokenModel->user_id);
                if ($user && $user->deleted_at === null) {
                    // Re-establecemos la sesión
                    $_SESSION['user_id'] = $user->id;
                    $_SESSION['user_role'] = $user->role;
                    $_SESSION['user_name'] = $user->name;
                    $_SESSION['created_time'] = time();
                    $_SESSION['last_activity'] = time();

                    // Rotación del token validador (prevención de ataques de replay)
                    $newValidator = bin2hex(random_bytes(16)); // Genera un validador nuevo de 32 caracteres hexadecimales
                    $tokenModel->hashed_validator = hash('sha256', $newValidator);
                    
                    // Extendemos la expiración 30 días a partir de ahora
                    $newExpiry = time() + (30 * 24 * 3600);
                    $tokenModel->expires_at = date('Y-m-d H:i:s', $newExpiry);
                    $tokenModel->save();

                    // Actualizar la cookie en el cliente
                    $cookieParams = session_get_cookie_params();
                    setcookie(
                        'remember_me',
                        $selector . ':' . $newValidator,
                        $newExpiry,
                        $cookieParams['path'],
                        $cookieParams['domain'],
                        $cookieParams['secure'],
                        $cookieParams['httponly']
                    );
                } else {
                    // Usuario no existe o está desactivado: limpiar token
                    $tokenModel->delete();
                    $cookieParams = session_get_cookie_params();
                    setcookie('remember_me', '', time() - 42000,
                        $cookieParams['path'], $cookieParams['domain'],
                        $cookieParams['secure'], $cookieParams['httponly']
                    );
                }
            } else {
                // Token inválido o expirado: limpiamos la cookie y el registro de la DB si existía
                if ($tokenModel) {
                    $tokenModel->delete();
                }
                $cookieParams = session_get_cookie_params();
                setcookie('remember_me', '', time() - 42000,
                    $cookieParams['path'], $cookieParams['domain'],
                    $cookieParams['secure'], $cookieParams['httponly']
                );
            }
        } catch (\Exception $e) {
            // Silenciar errores para evitar romper la carga de páginas públicas si la BD tiene problemas
        }
    }
}

