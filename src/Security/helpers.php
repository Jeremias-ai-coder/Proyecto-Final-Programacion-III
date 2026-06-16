<?php

// Funciones de sanitización y validación básica
if (!function_exists('sanitizeString')) {
    function sanitizeString($value) {
        if (!isset($value)) return '';
        return trim(strip_tags((string)$value));
    }
}

if (!function_exists('sanitizeInt')) {
    function sanitizeInt($value) {
        if ($value === null || $value === '') return null;
        return is_numeric($value) ? (int)$value : null;
    }
}

if (!function_exists('validateEmail')) {
    function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
}

if (!function_exists('validateDate')) {
    function validateDate($date) {
        $d = DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }
}

if (!function_exists('validateTime')) {
    function validateTime($time) {
        $t = DateTime::createFromFormat('H:i', $time);
        return $t && $t->format('H:i') === $time;
    }
}

if (!function_exists('validatePassword')) {
    function validatePassword($password) {
        return is_string($password) && strlen($password) >= 6;
    }
}

if (!function_exists('validateRole')) {
    function validateRole($role) {
        $validRoles = ['client', 'owner', 'administrator'];
        return in_array($role, $validRoles, true);
    }
}

if (!function_exists('jsonResponse')) {
    function jsonResponse($data, $status = 200) {
        header('Content-Type: application/json');
        http_response_code($status);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

if (!function_exists('writeLog')) {
    function writeLog($message, $level = 'ERROR') {
        try {
            $logDir = __DIR__ . '/../../logs';
            if (!is_dir($logDir)) {
                mkdir($logDir, 0755, true);
            }
            $logFile = $logDir . '/app.log';
            $timestamp = date('Y-m-d H:i:s');
            $formattedMessage = "[$timestamp] [$level] $message" . PHP_EOL;
            file_put_contents($logFile, $formattedMessage, FILE_APPEND);
        } catch (\Throwable $e) {
            // Silenciar fallos al escribir el log
        }
    }
}
