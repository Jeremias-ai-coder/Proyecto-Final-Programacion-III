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
