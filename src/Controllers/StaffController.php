<?php

namespace App\Controllers;

use App\Models\BusinessStaff;
use App\Models\Business;
use App\Models\User;

class StaffController
{
    public function handle($route, $method, $input)
    {
        $userId = $_SESSION['user_id'] ?? null;
        $userRole = $_SESSION['user_role'] ?? null;
        if (!$userId) {
            jsonResponse(['message' => 'No autorizado'], 401);
        }

        if ($method === 'GET') {
            $businessId = isset($_GET['business_id']) ? sanitizeInt($_GET['business_id']) : null;
            if (!$businessId) {
                jsonResponse(['message' => 'Falta business_id'], 400);
            }

            $business = Business::find($businessId);
            if (!$business) {
                jsonResponse(['message' => 'Negocio no encontrado'], 404);
            }

            // Validar permisos (solo dueño o admin del sistema)
            if ($business->owner_id !== $userId && $userRole !== 'administrator') {
                jsonResponse(['message' => 'No autorizado para ver el personal de este negocio.'], 403);
            }

            $staff = $business->staff()->get(['users.id', 'users.name', 'users.email']);
            jsonResponse($staff);
        }

        if ($method === 'POST') {
            $businessId = sanitizeInt($input['business_id'] ?? null);
            $email = sanitizeString($input['email'] ?? '');

            if (!$businessId || $email === '') {
                jsonResponse(['message' => 'business_id y email son obligatorios'], 400);
            }

            $business = Business::find($businessId);
            if (!$business) {
                jsonResponse(['message' => 'Negocio no encontrado'], 404);
            }

            // Validar permisos (solo dueño o admin del sistema)
            if ($business->owner_id !== $userId && $userRole !== 'administrator') {
                jsonResponse(['message' => 'No autorizado para invitar personal a este negocio.'], 403);
            }

            $userToInvite = User::where('email', $email)->first();
            if (!$userToInvite) {
                jsonResponse(['message' => 'El correo electrónico ingresado no pertenece a ningún usuario registrado.'], 404);
            }

            if ($userToInvite->id === $business->owner_id) {
                jsonResponse(['message' => 'El dueño del negocio no puede ser agregado como personal.'], 400);
            }

            $exists = BusinessStaff::where('business_id', $businessId)
                ->where('user_id', $userToInvite->id)
                ->exists();

            if ($exists) {
                jsonResponse(['message' => 'Este usuario ya está registrado como personal de este negocio.'], 400);
            }

            BusinessStaff::create([
                'business_id' => $businessId,
                'user_id' => $userToInvite->id
            ]);

            jsonResponse([
                'message' => 'Personal agregado con éxito.',
                'user' => [
                    'id' => $userToInvite->id,
                    'name' => $userToInvite->name,
                    'email' => $userToInvite->email
                ]
            ], 201);
        }

        if ($method === 'DELETE') {
            $businessId = isset($_GET['business_id']) ? sanitizeInt($_GET['business_id']) : null;
            $staffUserId = isset($_GET['user_id']) ? sanitizeInt($_GET['user_id']) : null;

            if (!$businessId || !$staffUserId) {
                jsonResponse(['message' => 'Falta business_id o user_id'], 400);
            }

            $business = Business::find($businessId);
            if (!$business) {
                jsonResponse(['message' => 'Negocio no encontrado'], 404);
            }

            // Validar permisos (solo dueño o admin del sistema)
            if ($business->owner_id !== $userId && $userRole !== 'administrator') {
                jsonResponse(['message' => 'No autorizado para eliminar personal de este negocio.'], 403);
            }

            $staffEntry = BusinessStaff::where('business_id', $businessId)
                ->where('user_id', $staffUserId)
                ->first();

            if (!$staffEntry) {
                jsonResponse(['message' => 'Registro de personal no encontrado'], 404);
            }

            $staffEntry->delete();
            jsonResponse(['message' => 'Personal revocado con éxito.']);
        }
    }
}
