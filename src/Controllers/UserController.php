<?php

namespace App\Controllers;

use App\Models\User;

class UserController
{
    public function handle($route, $method, $input)
    {
        if ($method === 'GET') {
            $sessionUserId = $_SESSION['user_id'] ?? null;
            $sessionUserRole = $_SESSION['user_role'] ?? null;

            if (!$sessionUserId) {
                jsonResponse(['message' => 'No autorizado'], 401);
            }

            // Buscar usuario por email o id, o listar todos
            if (isset($_GET['email'])) {
                $email = sanitizeString($_GET['email']);
                $user = User::where('email', $email)->first();
                if (!$user) jsonResponse(['message' => 'Usuario no encontrado'], 404);
                if ($user->id !== $sessionUserId && $sessionUserRole !== 'administrator') {
                    jsonResponse(['message' => 'No tienes permisos para ver esta información'], 403);
                }
                jsonResponse($user);
            }
            if (isset($_GET['id'])) {
                $id = sanitizeInt($_GET['id']);
                if ($id !== $sessionUserId && $sessionUserRole !== 'administrator') {
                    jsonResponse(['message' => 'No tienes permisos para ver esta información'], 403);
                }
                $user = User::find($id);
                if (!$user) jsonResponse(['message' => 'Usuario no encontrado'], 404);
                jsonResponse($user);
            }
            // Listar todos los usuarios requiere ser administrador
            if ($sessionUserRole !== 'administrator') {
                jsonResponse(['message' => 'No tienes permisos para ver esta lista'], 403);
            }
            $users = User::all();
            jsonResponse($users);
        }

        if ($method === 'POST') {
            $name = sanitizeString($input['name'] ?? '');
            $email = sanitizeString($input['email'] ?? '');
            $password = isset($input['password']) ? trim((string)$input['password']) : '';
            $role = 'client';

            if ($name === '' || $email === '') {
                jsonResponse(['message' => 'Nombre y email son obligatorios'], 400);
            }

            if (!validateEmail($email)) {
                jsonResponse(['message' => 'Email inválido'], 400);
            }

            if (!validatePassword($password)) {
                jsonResponse(['message' => 'La contraseña debe tener al menos 6 caracteres'], 400);
            }

            $existing = User::withTrashed()->where('email', $email)->first();
            if ($existing) {
                if ($existing->deleted_at !== null) {
                    jsonResponse(['message' => 'Este correo electrónico pertenece a una cuenta desactivada. Contacte a soporte para recuperarla.'], 409);
                }
                jsonResponse(['message' => 'Email ya registrado'], 409);
            }

            try {
                $user = User::create([
                    'name' => $name,
                    'email' => $email,
                    'password' => password_hash($password, PASSWORD_DEFAULT),
                    'role' => $role,
                ]);
                jsonResponse($user, 201);
            } catch (\Throwable $e) {
                jsonResponse(['message' => 'Hubo un problema al crear la cuenta. Por favor inténtalo nuevamente.'], 500);
            }
        }

        if ($method === 'PUT') {
            $sessionUserId = $_SESSION['user_id'] ?? null;
            $sessionUserRole = $_SESSION['user_role'] ?? null;
            if (!$sessionUserId) {
                jsonResponse(['message' => 'No autorizado'], 401);
            }

            $targetUserId = isset($input['id']) ? sanitizeInt($input['id']) : $sessionUserId;
            if ($targetUserId !== $sessionUserId && $sessionUserRole !== 'administrator') {
                jsonResponse(['message' => 'No tienes permisos para modificar este usuario.'], 403);
            }

            $user = User::find($targetUserId);
            if (!$user) {
                jsonResponse(['message' => 'Usuario no encontrado'], 404);
            }

            if (isset($input['email_notifications'])) {
                $user->email_notifications = (int)$input['email_notifications'];
            }
            if (isset($input['phone'])) {
                $user->phone = sanitizeString($input['phone']);
            }
            if (isset($input['whatsapp_notifications'])) {
                $user->whatsapp_notifications = (int)$input['whatsapp_notifications'];
            }
            if (isset($input['role']) && $sessionUserRole === 'administrator') {
                if (validateRole($input['role'])) {
                    $user->role = $input['role'];
                } else {
                    jsonResponse(['message' => 'Rol inválido'], 400);
                }
            }

            if (isset($input['new_password'])) {
                $oldPassword = isset($input['old_password']) ? trim((string)$input['old_password']) : '';
                $newPassword = trim((string)$input['new_password']);

                if ($targetUserId === $sessionUserId) {
                    if ($oldPassword === '' || !password_verify($oldPassword, $user->password)) {
                        jsonResponse(['message' => 'La contraseña actual ingresada es incorrecta.'], 400);
                    }
                }

                if (!validatePassword($newPassword)) {
                    jsonResponse(['message' => 'La nueva contraseña debe tener al menos 6 caracteres.'], 400);
                }

                $user->password = password_hash($newPassword, PASSWORD_DEFAULT);
            }

            $user->save();
            jsonResponse(['message' => 'Usuario actualizado con éxito', 'user' => $user]);
        }

        if ($method === 'DELETE') {
            $sessionUserId = $_SESSION['user_id'] ?? null;
            $sessionUserRole = $_SESSION['user_role'] ?? null;
            if (!$sessionUserId || $sessionUserRole !== 'administrator') {
                jsonResponse(['message' => 'No autorizado'], 401);
            }

            $targetId = isset($_GET['id']) ? sanitizeInt($_GET['id']) : null;
            if (!$targetId) {
                jsonResponse(['message' => 'Falta id de usuario'], 400);
            }

            if ($targetId === $sessionUserId) {
                jsonResponse(['message' => 'No puedes desactivar tu propia cuenta.'], 400);
            }

            $user = User::find($targetId);
            if (!$user) {
                jsonResponse(['message' => 'Usuario no encontrado'], 404);
            }

            $user->delete(); // Soft delete
            jsonResponse(['message' => 'Usuario desactivado con éxito']);
        }
    }
}
