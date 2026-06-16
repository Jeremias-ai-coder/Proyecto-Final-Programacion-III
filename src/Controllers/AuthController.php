<?php

namespace App\Controllers;

use App\Models\User;
use App\Models\UserRememberToken;

class AuthController
{
    public function handle($route, $method, $input)
    {
        if ($route === 'login') {
            if ($method === 'POST') {
                $email = sanitizeString($input['email'] ?? '');
                $password = sanitizeString($input['password'] ?? '');

                if ($email === '' || $password === '') {
                    jsonResponse(['message' => 'El correo y la contraseña son obligatorios'], 400);
                }

                $user = User::where('email', $email)->first();
                if (!$user || !password_verify($password, $user->password)) {
                    jsonResponse(['message' => 'Correo electrónico o contraseña incorrectos'], 401);
                }

                $_SESSION['user_id'] = $user->id;
                $_SESSION['user_role'] = $user->role;
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
                    'role' => $user->role,
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
    }
}
