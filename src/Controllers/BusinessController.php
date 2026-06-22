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
                $userId = $_SESSION['user_id'] ?? null;
                $userRole = $_SESSION['user_role'] ?? null;

                $query = Business::with([
                    'owner', 
                    'services' => function($q) use ($userId, $userRole) {
                        if ($userRole !== 'administrator') {
                            $q->where(function($sq) use ($userId) {
                                $sq->where('status', 'approved');
                                if ($userId) {
                                    $sq->orWhereHas('business', function($bq) use ($userId) {
                                        $bq->where('owner_id', $userId)
                                           ->orWhereHas('staff', function($sqq) use ($userId) {
                                               $sqq->where('users.id', $userId);
                                           });
                                    });
                                }
                            });
                        }
                    }, 
                    'workSchedules'
                ])
                ->withAvg('reviews', 'rating')
                ->withCount('reviews');
                if (isset($_GET['owner_id'])) {
                    $ownerId = sanitizeInt($_GET['owner_id']);
                    $query->where(function($q) use ($ownerId) {
                        $q->where('owner_id', $ownerId)
                          ->orWhereHas('staff', function($sq) use ($ownerId) {
                              $sq->where('users.id', $ownerId);
                          });
                    });
                }

                $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : null;
                $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : null;
                
                if ($limit !== null) {
                    $page = $page ?? 1;
                    $offset = ($page - 1) * $limit;
                    $total = $query->count();
                    header('X-Total-Count: ' . $total);
                    header('X-Total-Pages: ' . ($limit > 0 ? ceil($total / $limit) : 1));
                    header('X-Current-Page: ' . $page);
                    header('X-Per-Page: ' . $limit);
                    
                    $query->skip($offset)->take($limit);
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
                    $coords = $this->getGeocodingCoordinates($address);
                    if ($coords) {
                        $latitude = $coords['latitude'];
                        $longitude = $coords['longitude'];
                    }
                }

                // No bloquear si la geolocalización falla o no devuelve coordenadas. Se guardará como NULL.

                try {
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
                } catch (\Throwable $e) {
                    writeLog("Error al registrar negocio: " . $e->getMessage() . "\n" . $e->getTraceAsString());
                    jsonResponse(['message' => 'Error interno al registrar el negocio.'], 500);
                }
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
                    $coords = $this->getGeocodingCoordinates($address);
                    if ($coords) {
                        $latitude = $coords['latitude'];
                        $longitude = $coords['longitude'];
                    }
                }

                // No bloquear si la geolocalización falla o no devuelve coordenadas. Se guardará como NULL.

                try {
                    $business->update([
                        'name' => $name,
                        'description' => $description,
                        'address' => $address !== '' ? $address : null,
                        'logo_url' => $logoUrl !== '' ? $logoUrl : null,
                        'latitude' => $latitude,
                        'longitude' => $longitude,
                    ]);

                    jsonResponse($business);
                } catch (\Throwable $e) {
                    writeLog("Error al actualizar negocio (ID $id): " . $e->getMessage() . "\n" . $e->getTraceAsString());
                    jsonResponse(['message' => 'Error interno al actualizar el negocio.'], 500);
                }
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
                    $coords = $this->getGeocodingCoordinates($address);
                    if ($coords) {
                        $latitude = $coords['latitude'];
                        $longitude = $coords['longitude'];
                    }
                }

                // No bloquear si la geolocalización falla o no devuelve coordenadas. Se guardará como NULL.

                try {
                    $business = \Illuminate\Database\Capsule\Manager::transaction(function() use ($name, $description, $address, $logoUrl, $ownerId, $latitude, $longitude, $startDay, $endDay, $startTime, $endTime) {
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

                        return $business;
                    });

                    $business->load(['owner', 'services', 'workSchedules']);
                    jsonResponse($business, 201);
                } catch (\Throwable $e) {
                    writeLog("Error en transacción de negocio con horario: " . $e->getMessage() . "\n" . $e->getTraceAsString());
                    jsonResponse(['message' => 'Error interno al registrar el negocio y sus horarios.'], 500);
                }
            }
        }
    }

    private function getGeocodingCoordinates($address)
    {
        if ($address === '') {
            return null;
        }

        try {
            $cached = \App\Models\AddressCache::where('address', $address)->first();
            if ($cached) {
                return [
                    'latitude' => floatval($cached->latitude),
                    'longitude' => floatval($cached->longitude)
                ];
            }
        } catch (\Throwable $dbEx) {
            writeLog("Error al buscar en address_cache: " . $dbEx->getMessage());
        }

        $url = 'https://nominatim.openstreetmap.org/search?q=' . urlencode($address) . '&format=json&limit=1';
        $opts = [
            'http' => [
                'header' => "User-Agent: TurnosYa-App/1.0\r\n",
                'timeout' => 5
            ]
        ];
        $context = stream_context_create($opts);
        $response = @file_get_contents($url, false, $context);
        if ($response) {
            $data = json_decode($response, true);
            if (!empty($data) && isset($data[0]['lat']) && isset($data[0]['lon'])) {
                $latitude = floatval($data[0]['lat']);
                $longitude = floatval($data[0]['lon']);

                try {
                    \App\Models\AddressCache::create([
                        'address' => $address,
                        'latitude' => $latitude,
                        'longitude' => $longitude
                    ]);
                } catch (\Throwable $cacheEx) {
                    writeLog("Error al guardar en address_cache: " . $cacheEx->getMessage());
                }

                return [
                    'latitude' => $latitude,
                    'longitude' => $longitude
                ];
            }
        }

        return null;
    }
}
