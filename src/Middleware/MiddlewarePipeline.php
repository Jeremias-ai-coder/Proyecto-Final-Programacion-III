<?php

namespace App\Middleware;

class MiddlewarePipeline
{
    protected $middlewares = [];

    public function pipe(Middleware $middleware)
    {
        $this->middlewares[] = $middleware;
        return $this;
    }

    public function process(string $route, string $method, array $input, callable $core)
    {
        $index = 0;

        $next = function(array $input) use (&$index, $route, $method, &$next, $core) {
            if ($index < count($this->middlewares)) {
                $middleware = $this->middlewares[$index++];
                return $middleware->handle($route, $method, $input, $next);
            }
            return $core($route, $method, $input);
        };

        return $next($input);
    }
}
