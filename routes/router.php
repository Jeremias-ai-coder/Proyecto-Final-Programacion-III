<?php
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = rawurldecode($uri);

// Detecta la ruta base dinámica (funciona tanto con el acceso directo a public/ como con las reescrituras de htaccess en el directorio raíz)
$basePath = '';
$scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '');
$scriptDir = str_replace('\\', '/', $scriptDir);

if ($scriptDir !== '/') {
    if (strpos($path, $scriptDir) === 0) {
        $basePath = $scriptDir;
    } else {
        $publicPos = strpos($scriptDir, '/public');
        if ($publicPos !== false) {
            $basePath = substr($scriptDir, 0, $publicPos);
        } else {
            $basePath = $scriptDir;
        }
    }
}

// Mantiene una copia de la ruta original para las comprobaciones de archivos estáticos antes de quitar la ruta base
$originalPath = $path;
$file = __DIR__ . '/../public' . $originalPath;

if ($originalPath !== '/' && file_exists($file) && !is_dir($file)) {
    return false;
}

// Elimina la ruta base de la ruta de enrutamiento
if ($basePath !== '' && strpos($path, $basePath) === 0) {
    $path = substr($path, strlen($basePath));
}
if ($path === '') {
    $path = '/';
}

if ($path === '/' || $path === '') {
    require __DIR__ . '/../vistas/inicio.html';
    return;
}

if ($path === '/registro') {
    require __DIR__ . '/../vistas/registro.html';
    return;
}

if ($path === '/login') {
    require __DIR__ . '/../vistas/login.html';
    return;
}

if ($path === '/recuperar-clave') {
    require __DIR__ . '/../vistas/recuperar_clave.html';
    return;
}

if ($path === '/restablecer-clave') {
    require __DIR__ . '/../vistas/restablecer_clave.html';
    return;
}

if ($path === '/dashboard') {
    require __DIR__ . '/../vistas/administrador.html';
    return;
}

if ($path === '/sistema' || $path === '/admin') {
    if (($_SESSION['user_role'] ?? '') !== 'administrator') {
        header('Location: ' . $basePath . '/login');
        return;
    }
    require __DIR__ . '/../vistas/sistema.html';
    return;
}

if ($path === '/pagina-inicio' || $path === '/client') {
    require __DIR__ . '/../vistas/pagina_inicio.html';
    return;
}

if ($path === '/crear-negocio' || $path === '/ingresar-negocio') {
    require __DIR__ . '/../vistas/crear_negocio.html';
    return;
}

if ($path === '/agregar-horario') {
    require __DIR__ . '/../vistas/agregar_horario.html';
    return;
}

if (preg_match('#^/api(?:/(.*))?$#', $path, $matches)) {
    if (!empty($matches[1])) {
        $_GET['route'] = $matches[1];
    }
    require __DIR__ . '/../public/api.php';
    return;
}

http_response_code(404);
header('Content-Type: text/plain');
echo 'Página no encontrada';
