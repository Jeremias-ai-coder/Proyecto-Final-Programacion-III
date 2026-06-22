<?php

require __DIR__ . '/../src/bootstrap.php';

use App\Middleware\MiddlewarePipeline;
use App\Middleware\RateLimitMiddleware;
use App\Middleware\AuthMiddleware;

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$scriptName = dirname($_SERVER['SCRIPT_NAME']);
$routePath = trim(preg_replace('#^' . preg_quote($scriptName, '#') . '#', '', $uri), '/');
$routeSegments = explode('/', $routePath);
$route = '';
if (isset($routeSegments[1]) && $routeSegments[0] === 'api') {
    $route = $routeSegments[1];
} elseif (isset($_GET['route'])) {
    $route = $_GET['route'];
}

// Mapeo de rutas a controladores
$routesMap = [
    'businesses'               => \App\Controllers\BusinessController::class,
    'businesses-with-schedule' => \App\Controllers\BusinessController::class,
    'users'                    => \App\Controllers\UserController::class,
    'login'                    => \App\Controllers\AuthController::class,
    'logout'                   => \App\Controllers\AuthController::class,
    'forgot-password'          => \App\Controllers\AuthController::class,
    'reset-password'           => \App\Controllers\AuthController::class,
    'services'                 => \App\Controllers\ServiceController::class,
    'schedule'                 => \App\Controllers\ScheduleController::class,
    'agenda'                   => \App\Controllers\AgendaController::class,
    'reviews'                  => \App\Controllers\ReviewController::class,
    'appointments'             => \App\Controllers\AppointmentController::class,
    'notifications'            => \App\Controllers\NotificationController::class,
    'staff'                    => \App\Controllers\StaffController::class,
    'mail-queue'               => \App\Controllers\MailQueueController::class,
    'system-logs'              => \App\Controllers\SystemLogController::class,
    'system-stats'             => \App\Controllers\SystemStatsController::class,
    'security-locks'           => \App\Controllers\SecurityLocksController::class,
];

if (!isset($routesMap[$route])) {
    jsonResponse(['message' => 'Ruta no encontrada'], 404);
}

// Procesar la petición a través de la tubería de Middlewares (punto 2, reorganización)
$pipeline = new MiddlewarePipeline();
$pipeline->pipe(new RateLimitMiddleware())
         ->pipe(new AuthMiddleware());

$pipeline->process($route, $method, $input, function($route, $method, $input) use ($routesMap) {
    $controllerClass = $routesMap[$route];
    $controller = new $controllerClass();
    $controller->handle($route, $method, $input);
});
