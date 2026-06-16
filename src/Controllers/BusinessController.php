<?php

namespace App\Controllers;

use App\Models\Business;
use App\Models\User;
use App\Models\WorkSchedule;

class BusinessController
{
    public function handle($route, $method, $input)
    {
        if ($route === 'businesses') {
            if ($method === 'GET') {
                $query = Business::with(['owner', 'services', 'workSchedules'])
                    ->withAvg('reviews', 'rating')
                    ->withCount('reviews');
                if (isset($_GET['owner_id'])) {
                    $ownerId = sanitizeInt($_GET['owner_id']);
                    $query->where('owner_id', $ownerId);
                }
                $businesses = $query->get();
                jsonResponse($businesses);
            }

            if ($method === 'POST') {
                $name = sanitizeString($input['name'] ?? '');
                $description = sanitizeString($input['description'] ?? '');
                $address = sanitizeString($input['address'] ?? '');
                $logoUrl = sanitizeString($input['logo_url'] ?? '');
                $latitude = isset($input['latitude']) && $input['latitude'] !== '' ? floatval($input['latitude']) : null;
                $longitude = isset($input['longitude']) && $input['longitude'] !== '' ? floatval($input['longitude']) : null;
                
                $ownerId = $_SESSION['user_id'] ?? null;

                if ($name === '') {
                    jsonResponse(['message' => 'El nombre es obligatorio'], 400);
                }

                if ($ownerId === null || !User::find($ownerId)) {
                    jsonResponse(['message' => 'Inicie sesión para registrar un negocio.'], 401);
                }

                if (($latitude === null || $longitude === null) && $address !== '') {
                    $url = 'https://nominatim.openstreetmap.org/search?q=' . urlencode($address) . '&format=json&limit=1';
                    $opts = [
                        'http' => [
                            'header' => "User-Agent: TurnosYa-App/1.0\r\n"
                        ]
                    ];
                    $context = stream_context_create($opts);
                    $response = @file_get_contents($url, false, $context);
                    if ($response) {
                        $data = json_decode($response, true);
                        if (!empty($data) && isset($data[0]['lat']) && isset($data[0]['lon'])) {
                            $latitude = floatval($data[0]['lat']);
                            $longitude = floatval($data[0]['lon']);
                        }
                    }
                }

                if ($address !== '' && ($latitude === null || $longitude === null)) {
                    jsonResponse(['message' => 'La dirección ingresada no existe o no se pudo validar.'], 400);
                }

                $business = Business::create([
                    'name' => $name,
                    'description' => $description,
                    'address' => $address !== '' ? $address : null,
                    'logo_url' => $logoUrl !== '' ? $logoUrl : null,
                    'owner_id' => $ownerId,
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                ]);

                $ownerUser = User::find($ownerId);
                if ($ownerUser && $ownerUser->role === 'client') {
                    $ownerUser->role = 'owner';
                    $ownerUser->save();
                    if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $ownerId) {
                        $_SESSION['user_role'] = 'owner';
                    }
                }

                jsonResponse($business, 201);
            }

            if ($method === 'PUT') {
                $id = sanitizeInt($input['id'] ?? null);
                $name = sanitizeString($input['name'] ?? '');
                $description = sanitizeString($input['description'] ?? '');
                $address = sanitizeString($input['address'] ?? '');
                $logoUrl = sanitizeString($input['logo_url'] ?? '');
                $latitude = isset($input['latitude']) && $input['latitude'] !== '' ? floatval($input['latitude']) : null;
                $longitude = isset($input['longitude']) && $input['longitude'] !== '' ? floatval($input['longitude']) : null;

                if ($id === null) {
                    jsonResponse(['message' => 'El id del negocio es obligatorio'], 400);
                }
                if ($name === '') {
                    jsonResponse(['message' => 'El nombre es obligatorio'], 400);
                }

                $business = Business::find($id);
                if (!$business) {
                    jsonResponse(['message' => 'Negocio no encontrado'], 404);
                }

                // Validar que el usuario sea el dueño de este negocio o sea un administrador (Seguridad corregida)
                $userId = $_SESSION['user_id'] ?? null;
                $userRole = $_SESSION['user_role'] ?? null;
                if ($userId === null || ($business->owner_id !== $userId && $userRole !== 'administrator')) {
                    jsonResponse(['message' => 'No tienes permisos para editar este negocio.'], 403);
                }

                if (($latitude === null || $longitude === null) && $address !== '') {
                    $url = 'https://nominatim.openstreetmap.org/search?q=' . urlencode($address) . '&format=json&limit=1';
                    $opts = [
                        'http' => [
                            'header' => "User-Agent: TurnosYa-App/1.0\r\n"
                        ]
                    ];
                    $context = stream_context_create($opts);
                    $response = @file_get_contents($url, false, $context);
                    if ($response) {
                        $data = json_decode($response, true);
                        if (!empty($data) && isset($data[0]['lat']) && isset($data[0]['lon'])) {
                            $latitude = floatval($data[0]['lat']);
                            $longitude = floatval($data[0]['lon']);
                        }
                    }
                }

                if ($address !== '' && ($latitude === null || $longitude === null)) {
                    jsonResponse(['message' => 'La dirección ingresada no existe o no se pudo validar.'], 400);
                }

                $business->update([
                    'name' => $name,
                    'description' => $description,
                    'address' => $address !== '' ? $address : null,
                    'logo_url' => $logoUrl !== '' ? $logoUrl : null,
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                ]);

                jsonResponse($business);
            }

            if ($method === 'DELETE') {
                $id = $_GET['id'] ?? null;
                if (!$id) {
                    jsonResponse(['message' => 'Falta el id del negocio'], 400);
                }
                $business = Business::find($id);
                if (!$business) {
                    jsonResponse(['message' => 'Negocio no encontrado'], 404);
                }

                // Validar permisos: debe ser el dueño del negocio o un administrador
                $userId = $_SESSION['user_id'] ?? null;
                $userRole = $_SESSION['user_role'] ?? null;
                if ($business->owner_id !== $userId && $userRole !== 'administrator') {
                    jsonResponse(['message' => 'No tienes permisos para eliminar este negocio.'], 403);
                }

                $business->delete();

                // Si el dueño ya no tiene más negocios, volver su rol a 'client'
                if ($userId && $userRole === 'owner') {
                    $hasOther = Business::where('owner_id', $userId)->exists();
                    if (!$hasOther) {
                        $user = User::find($userId);
                        if ($user) {
                            $user->role = 'client';
                            $user->save();
                            $_SESSION['user_role'] = 'client';
                        }
                    }
                }

                jsonResponse(['message' => 'Negocio eliminado correctamente', 'role' => $_SESSION['user_role'] ?? 'client']);
            }
        }

        if ($route === 'businesses-with-schedule') {
            if ($method === 'POST') {
                $name = sanitizeString($input['name'] ?? '');
                $description = sanitizeString($input['description'] ?? '');
                $address = sanitizeString($input['address'] ?? '');
                $logoUrl = sanitizeString($input['logo_url'] ?? '');
                $latitude = isset($input['latitude']) && $input['latitude'] !== '' ? floatval($input['latitude']) : null;
                $longitude = isset($input['longitude']) && $input['longitude'] !== '' ? floatval($input['longitude']) : null;
                
                $ownerId = $_SESSION['user_id'] ?? null;
                
                $startDay = sanitizeInt($input['start_day'] ?? null);
                $endDay = sanitizeInt($input['end_day'] ?? null);
                $startTime = sanitizeString($input['start_time'] ?? '');
                $endTime = sanitizeString($input['end_time'] ?? '');

                if ($name === '') {
                    jsonResponse(['message' => 'El nombre es obligatorio'], 400);
                }
                if ($ownerId === null || !User::find($ownerId)) {
                    jsonResponse(['message' => 'Inicie sesión para registrar un negocio.'], 401);
                }
                if ($startDay === null || $endDay === null || $startDay < 1 || $startDay > 7 || $endDay < 1 || $endDay > 7 || $endDay < $startDay) {
                    jsonResponse(['message' => 'Rango de días inválido'], 400);
                }
                if (!validateTime($startTime) || !validateTime($endTime)) {
                    jsonResponse(['message' => 'Formato de hora inválido (HH:MM)'], 400);
                }
                if ($startTime >= $endTime) {
                    jsonResponse(['message' => 'La hora de inicio debe ser anterior a la hora de fin'], 400);
                }

                if (($latitude === null || $longitude === null) && $address !== '') {
                    $url = 'https://nominatim.openstreetmap.org/search?q=' . urlencode($address) . '&format=json&limit=1';
                    $opts = [
                        'http' => [
                            'header' => "User-Agent: TurnosYa-App/1.0\r\n"
                        ]
                    ];
                    $context = stream_context_create($opts);
                    $response = @file_get_contents($url, false, $context);
                    if ($response) {
                        $data = json_decode($response, true);
                        if (!empty($data) && isset($data[0]['lat']) && isset($data[0]['lon'])) {
                            $latitude = floatval($data[0]['lat']);
                            $longitude = floatval($data[0]['lon']);
                        }
                    }
                }

                if ($address !== '' && ($latitude === null || $longitude === null)) {
                    jsonResponse(['message' => 'La dirección ingresada no existe o no se pudo validar.'], 400);
                }

                $business = Business::create([
                    'name' => $name,
                    'description' => $description,
                    'address' => $address !== '' ? $address : null,
                    'logo_url' => $logoUrl !== '' ? $logoUrl : null,
                    'owner_id' => $ownerId,
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                ]);

                for ($day = $startDay; $day <= $endDay; $day++) {
                    WorkSchedule::create([
                        'business_id' => $business->id,
                        'day_of_week' => $day,
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                    ]);
                }

                $ownerUser = User::find($ownerId);
                if ($ownerUser && $ownerUser->role === 'client') {
                    $ownerUser->role = 'owner';
                    $ownerUser->save();
                    if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $ownerId) {
                        $_SESSION['user_role'] = 'owner';
                    }
                }

                $business->load(['owner', 'services', 'workSchedules']);
                jsonResponse($business, 201);
            }
        }
    }
}
