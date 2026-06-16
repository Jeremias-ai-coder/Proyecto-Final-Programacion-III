<?php

namespace App\Middleware;

class AuthMiddleware implements Middleware
{
    // Rutas públicas que no requieren autenticación
    protected $publicRoutes = [
        'login' => ['POST'],
        'logout' => ['POST'],
        'users' => ['POST'],
        'businesses' => ['GET'],
        'services' => ['GET'],
        'agenda' => ['GET'],
        'reviews' => ['GET'],
    ];

    public function handle(string $route, string $method, array $input, callable $next)
    {
        // Verificar si la combinación ruta/método es pública
        if (isset($this->publicRoutes[$route]) && in_array($method, $this->publicRoutes[$route], true)) {
            return $next($input);
        }

        // Si no es pública, requerir sesión iniciada
        $userId = $_SESSION['user_id'] ?? null;
        if (!$userId) {
            jsonResponse(['message' => 'No autorizado. Por favor inicie sesión.'], 401);
        }

        return $next($input);
    }
}
