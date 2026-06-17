<?php

namespace App\Controllers;

use App\Models\User;
use App\Models\UserRememberToken;
use App\Security\LoginRateLimiter;

class AuthController
{
    public function handle($route, $method, $input)
    {
        if ($route === 'login') {
            if ($method === 'POST') {
                $email = sanitizeString($input['email'] ?? '');
                $password = isset($input['password']) ? trim((string)$input['password']) : '';

                if ($email === '' || $password === '') {
                    jsonResponse(['message' => 'El correo y la contraseña son obligatorios'], 400);
                }

                $limiter = new LoginRateLimiter();
                $lockCheck = $limiter->isLocked($email);
                if ($lockCheck['locked']) {
                    $mins = ceil($lockCheck['remaining_seconds'] / 60);
                    jsonResponse(['message' => "Cuenta bloqueada temporalmente debido a demasiados intentos fallidos. Intente de nuevo en {$mins} minutos."], 429);
                }

                $user = User::where('email', $email)->first();
                if (!$user || !password_verify($password, $user->password)) {
                    $limiter->registerFailedAttempt($email);
                    jsonResponse(['message' => 'Correo electrónico o contraseña incorrectos'], 401);
                }

                $role = $user->role;
                if ($role === 'client') {
                    $isStaff = \App\Models\BusinessStaff::where('user_id', $user->id)->exists();
                    if ($isStaff) {
                        $role = 'staff';
                    }
                }

                $limiter->resetAttempts($email);

                session_regenerate_id(true);

                $_SESSION['user_id'] = $user->id;
                $_SESSION['user_role'] = $role;
                $_SESSION['user_name'] = $user->name;
                $_SESSION['created_time'] = time();
                $_SESSION['last_activity'] = time();

                // Recordarme (Remember Me) por 30 días si es seleccionado
                $rememberMe = isset($input['remember_me']) && $input['remember_me'] === true;
                if ($rememberMe) {
                    try {
                        $selector = bin2hex(random_bytes(8)); // 16 caracteres hexadecimales
                        $validator = bin2hex(random_bytes(16)); // 32 caracteres hexadecimales
                        $expiry = time() + (30 * 24 * 3600); // 30 días de vida

                        UserRememberToken::create([
                            'user_id' => $user->id,
                            'selector' => $selector,
                            'hashed_validator' => hash('sha256', $validator),
                            'expires_at' => date('Y-m-d H:i:s', $expiry),
                        ]);

                        $cookieParams = session_get_cookie_params();
                        setcookie(
                            'remember_me',
                            $selector . ':' . $validator,
                            $expiry,
                            $cookieParams['path'],
                            $cookieParams['domain'],
                            $cookieParams['secure'],
                            $cookieParams['httponly']
                        );
                    } catch (\Exception $e) {
                        // Si ocurre un error guardando el token, igual procedemos con el login de sesión común
                    }
                }

                // Garbage collection preventiva para eliminar tokens viejos y evitar llenar la base de datos
                try {
                    UserRememberToken::where('expires_at', '<', date('Y-m-d H:i:s'))->delete();
                } catch (\Exception $e) {}

                jsonResponse([
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $role,
                ]);
            }
        }

        if ($route === 'logout') {
            if ($method === 'POST') {
                // Eliminar token de remember_me si existe en base de datos y limpiar la cookie
                if (isset($_COOKIE['remember_me'])) {
                    $cookieValue = $_COOKIE['remember_me'];
                    $parts = explode(':', $cookieValue, 2);
                    if (count($parts) === 2) {
                        $selector = $parts[0];
                        try {
                            UserRememberToken::where('selector', $selector)->delete();
                        } catch (\Exception $e) {}
                    }
                    $params = session_get_cookie_params();
                    setcookie('remember_me', '', time() - 42000,
                        $params["path"], $params["domain"],
                        $params["secure"], $params["httponly"]
                    );
                }

                $_SESSION = [];
                if (ini_get("session.use_cookies")) {
                    $params = session_get_cookie_params();
                    setcookie(session_name(), '', time() - 42000,
                        $params["path"], $params["domain"],
                        $params["secure"], $params["httponly"]
                    );
                }
                session_destroy();
                jsonResponse(['message' => 'Sesión cerrada']);
            }
        }

        if ($route === 'forgot-password') {
            if ($method === 'POST') {
                $email = sanitizeString($input['email'] ?? '');

                if ($email === '') {
                    jsonResponse(['message' => 'El correo electrónico es obligatorio.'], 400);
                }

                if (!validateEmail($email)) {
                    jsonResponse(['message' => 'El formato del correo electrónico es inválido.'], 400);
                }

                $user = User::where('email', $email)->first();
                if (!$user) {
                    jsonResponse(['message' => 'Si el correo electrónico coincide con una cuenta activa, recibirás un enlace de recuperación.']);
                }

                if ($user->deleted_at !== null) {
                    jsonResponse(['message' => 'Esta cuenta se encuentra desactivada.'], 400);
                }

                try {
                    $plainToken = bin2hex(random_bytes(32));
                    $hashedToken = hash('sha256', $plainToken);
                    $expiry = date('Y-m-d H:i:s', time() + 3600);

                    \App\Models\PasswordResetToken::where('email', $email)->delete();

                    \App\Models\PasswordResetToken::create([
                        'email' => $email,
                        'token' => $hashedToken,
                        'expires_at' => $expiry
                    ]);

                    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                    $host = $_SERVER['HTTP_HOST'];
                    
                    $scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '');
                    $scriptDir = str_replace('\\', '/', $scriptDir);
                    $basePath = '';
                    if ($scriptDir !== '/') {
                        $publicPos = strpos($scriptDir, '/public');
                        if ($publicPos !== false) {
                            $basePath = substr($scriptDir, 0, $publicPos);
                        } else {
                            $basePath = $scriptDir;
                        }
                    }
                    $resetLink = $protocol . '://' . $host . $basePath . '/restablecer-clave?token=' . $plainToken;

                    \App\Services\Mailer::sendPasswordResetEmail($user->email, $user->name, $resetLink);

                    jsonResponse(['message' => 'Si el correo electrónico coincide con una cuenta activa, recibirás un enlace de recuperación.']);
                } catch (\Exception $e) {
                    jsonResponse(['message' => 'Hubo un error al procesar tu solicitud: ' . $e->getMessage()], 500);
                }
            }
        }

        if ($route === 'reset-password') {
            if ($method === 'POST') {
                $token = sanitizeString($input['token'] ?? '');
                $password = isset($input['password']) ? trim((string)$input['password']) : '';

                if ($token === '') {
                    jsonResponse(['message' => 'El token de recuperación es obligatorio.'], 400);
                }

                if (!validatePassword($password)) {
                    jsonResponse(['message' => 'La contraseña debe tener al menos 6 caracteres.'], 400);
                }

                $hashedToken = hash('sha256', $token);
                $resetRecord = \App\Models\PasswordResetToken::where('token', $hashedToken)
                    ->where('expires_at', '>', date('Y-m-d H:i:s'))
                    ->first();

                if (!$resetRecord) {
                    jsonResponse(['message' => 'El enlace de recuperación es inválido o ha expirado.'], 400);
                }

                $user = User::where('email', $resetRecord->email)->first();
                if (!$user) {
                    jsonResponse(['message' => 'Usuario asociado a este token no encontrado.'], 404);
                }

                try {
                    $user->password = password_hash($password, PASSWORD_DEFAULT);
                    $user->save();

                    $resetRecord->delete();

                    $limiter = new LoginRateLimiter();
                    $limiter->resetAttempts($user->email);

                    jsonResponse(['message' => 'Tu contraseña ha sido restablecida con éxito.']);
                } catch (\Exception $e) {
                    jsonResponse(['message' => 'Ocurrió un error al restablecer la contraseña.'], 500);
                }
            }
        }
    }
}
