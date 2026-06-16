<?php

namespace App\Middleware;

interface Middleware
{
    public function handle(string $route, string $method, array $input, callable $next);
}
