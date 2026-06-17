<?php

namespace App\Controllers;

use App\Models\Service;
use App\Models\Business;

class ServiceController
{
    public function handle($route, $method, $input)
    {
        if ($method === 'GET') {
            $search = $_GET['search'] ?? '';
            $businessFilter = isset($_GET['business_id']) ? sanitizeInt($_GET['business_id']) : null;
            $query = Service::with('business');
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }
            if ($businessFilter) {
                $query->where('business_id', $businessFilter);
            }
            jsonResponse($query->get());
        }

        if ($method === 'POST') {
            $businessId = sanitizeInt($input['business_id'] ?? null);
            $name = sanitizeString($input['name'] ?? '');
            $description = sanitizeString($input['description'] ?? '');
            $duration = sanitizeInt($input['duration_minutes'] ?? 30) ?? 30;
            $price = isset($input['price']) ? floatval($input['price']) : 0;

            if (!$businessId) {
                jsonResponse(['message' => 'business_id es obligatorio'], 400);
            }
            $business = Business::find($businessId);
            if (!$business) {
                jsonResponse(['message' => 'El negocio no existe'], 400);
            }

            // Validar propiedad del negocio
            $userId = $_SESSION['user_id'] ?? null;
            $userRole = $_SESSION['user_role'] ?? null;
            $isStaff = \App\Models\BusinessStaff::where('business_id', $business->id)->where('user_id', $userId)->exists();
            if ($business->owner_id !== $userId && !$isStaff && $userRole !== 'administrator') {
                jsonResponse(['message' => 'No tienes permisos para agregar servicios a este negocio.'], 403);
            }
            if ($name === '') {
                jsonResponse(['message' => 'El nombre del servicio es obligatorio'], 400);
            }

            $service = Service::create([
                'business_id' => $businessId,
                'name' => $name,
                'description' => $description,
                'duration_minutes' => $duration,
                'price' => $price,
            ]);
            jsonResponse($service, 201);
        }

        if ($method === 'DELETE') {
            $id = $_GET['id'] ?? null;
            if (!$id) {
                jsonResponse(['message' => 'Falta el id del servicio'], 400);
            }
            $service = Service::find($id);
            if (!$service) {
                jsonResponse(['message' => 'Servicio no encontrado'], 404);
            }

            // Validar permisos
            $userId = $_SESSION['user_id'] ?? null;
            $userRole = $_SESSION['user_role'] ?? null;
            $business = Business::find($service->business_id);
            $isStaff = $business && \App\Models\BusinessStaff::where('business_id', $business->id)->where('user_id', $userId)->exists();
            if (!$business || ($business->owner_id !== $userId && !$isStaff && $userRole !== 'administrator')) {
                jsonResponse(['message' => 'No tienes permisos para eliminar este servicio.'], 403);
            }

            $service->delete();
            jsonResponse(['message' => 'Servicio eliminado correctamente']);
        }
    }
}
