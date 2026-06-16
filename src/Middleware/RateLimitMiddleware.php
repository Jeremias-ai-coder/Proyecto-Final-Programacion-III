<?php

namespace App\Middleware;

use App\Security\RateLimiter;

class RateLimitMiddleware implements Middleware
{
    protected $limiter;

    public function __construct()
    {
        // 60 solicitudes por minuto
        $this->limiter = new RateLimiter(60, 60);
    }

    public function handle(string $route, string $method, array $input, callable $next)
    {
        $clientIp = $this->limiter->getClientIp();
        $limitCheck = $this->limiter->check($clientIp);

        if (!$limitCheck['allowed']) {
            header('Retry-After: ' . $limitCheck['retry_after']);
            jsonResponse([
                'message' => 'Demasiadas solicitudes. Por favor, inténtalo de nuevo en ' . $limitCheck['retry_after'] . ' segundos.'
            ], 429);
        }

        header('X-RateLimit-Limit: 60');
        header('X-RateLimit-Remaining: ' . $limitCheck['remaining']);

        return $next($input);
    }
}
