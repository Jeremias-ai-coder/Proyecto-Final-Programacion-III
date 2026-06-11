<?php
require __DIR__ . '/../src/bootstrap.php';

use App\Models\Business;
use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use App\Models\WorkSchedule;

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

function jsonResponse($data, $status = 200) {
    header('Content-Type: application/json');
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}




// Aplicar limitación de tasa (60 solicitudes por minuto por IP)
$limiter = new \App\Security\RateLimiter(60, 60);
$clientIp = $limiter->getClientIp();
$limitCheck = $limiter->check($clientIp);

if (!$limitCheck['allowed']) {
    header('Retry-After: ' . $limitCheck['retry_after']);
    jsonResponse([
        'message' => 'Demasiadas solicitudes. Por favor, inténtalo de nuevo en ' . $limitCheck['retry_after'] . ' segundos.'
    ], 429);
}

header('X-RateLimit-Limit: 60');
header('X-RateLimit-Remaining: ' . $limitCheck['remaining']);

switch ($route) {
    case 'businesses':
        if ($method === 'GET') {
            $query = Business::with(['owner', 'services', 'workSchedules']);
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
            
            $ownerId = $_SESSION['user_id'] ?? null;

            if ($name === '') {
                jsonResponse(['message' => 'El nombre es obligatorio'], 400);
            }

            if ($ownerId === null || !User::find($ownerId)) {
                jsonResponse(['message' => 'Inicie sesión para registrar un negocio.'], 401);
            }

            $business = Business::create([
                'name' => $name,
                'description' => $description,
                'address' => $address !== '' ? $address : null,
                'logo_url' => $logoUrl !== '' ? $logoUrl : null,
                'owner_id' => $ownerId,
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
            $ownerId = sanitizeInt($input['owner_id'] ?? null);
            $name = sanitizeString($input['name'] ?? '');
            $description = sanitizeString($input['description'] ?? '');
            $address = sanitizeString($input['address'] ?? '');
            $logoUrl = sanitizeString($input['logo_url'] ?? '');

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

            // Validar que el usuario sea el dueño de este negocio o sea un administrador
            $requestingUser = User::find($ownerId);
            if ($ownerId === null || !$requestingUser || ($business->owner_id !== $ownerId && $requestingUser->role !== 'administrator')) {
                jsonResponse(['message' => 'No tienes permisos para editar este negocio.'], 403);
            }

            $business->update([
                'name' => $name,
                'description' => $description,
                'address' => $address !== '' ? $address : null,
                'logo_url' => $logoUrl !== '' ? $logoUrl : null,
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
        break;

    case 'businesses-with-schedule':
        if ($method === 'POST') {
            $name = sanitizeString($input['name'] ?? '');
            $description = sanitizeString($input['description'] ?? '');
            $address = sanitizeString($input['address'] ?? '');
            $logoUrl = sanitizeString($input['logo_url'] ?? '');
            
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

            $business = Business::create([
                'name' => $name,
                'description' => $description,
                'address' => $address !== '' ? $address : null,
                'logo_url' => $logoUrl !== '' ? $logoUrl : null,
                'owner_id' => $ownerId,
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
        break;

    case 'users':
            if ($method === 'GET') {
                // Buscar usuario por email o id, o listar todos
                if (isset($_GET['email'])) {
                    $email = sanitizeString($_GET['email']);
                    $user = User::where('email', $email)->first();
                    if (!$user) jsonResponse(['message' => 'Usuario no encontrado'], 404);
                    jsonResponse($user);
                }
                if (isset($_GET['id'])) {
                    $id = sanitizeInt($_GET['id']);
                    $user = User::find($id);
                    if (!$user) jsonResponse(['message' => 'Usuario no encontrado'], 404);
                    jsonResponse($user);
                }
                $users = User::all();
                jsonResponse($users);
            }

            if ($method === 'POST') {
            $name = sanitizeString($input['name'] ?? '');
            $email = sanitizeString($input['email'] ?? '');
            $password = sanitizeString($input['password'] ?? '');
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
            } catch (Throwable $e) {
                jsonResponse(['message' => 'Hubo un problema al crear la cuenta. Por favor inténtalo nuevamente.'], 500);
            }
        }
        break;

    case 'login':
        if ($method === 'POST') {
            $email = sanitizeString($input['email'] ?? '');
            $password = sanitizeString($input['password'] ?? '');

            if ($email === '' || $password === '') {
                jsonResponse(['message' => 'El correo y la contraseña son obligatorios'], 400);
            }

            $user = User::where('email', $email)->first();
            if (!$user || !password_verify($password, $user->password)) {
                jsonResponse(['message' => 'Correo electrónico o contraseña incorrectos'], 401);
            }

            $_SESSION['user_id'] = $user->id;
            $_SESSION['user_role'] = $user->role;
            $_SESSION['user_name'] = $user->name;

            jsonResponse([
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ]);
        }
        break;

    case 'logout':
        if ($method === 'POST') {
            $_SESSION = [];
            if (ini_get("session.use_cookies")) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000,
                    $params["path"], $params["domain"],
                    $params["secure"], $params["httponly"]
                );
            }
            session_destroy();
            jsonResponse(['message' => 'Sesión cerrada']);
        }
        break;

    case 'services':
        if ($method === 'GET') {
            $search = $_GET['search'] ?? '';
            $businessFilter = isset($_GET['business_id']) ? sanitizeInt($_GET['business_id']) : null;
            $query = Service::with('business');
            if ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
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

            if (!$businessId || !Business::find($businessId)) {
                jsonResponse(['message' => 'business_id inválido o no existe'], 400);
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
        break;

    case 'schedule':
        if ($method === 'POST') {
            $businessId = sanitizeInt($input['business_id'] ?? null);
            $day = sanitizeInt($input['day_of_week'] ?? 1) ?? 1;
            $start = sanitizeString($input['start_time'] ?? '09:00');
            $end = sanitizeString($input['end_time'] ?? '18:00');

            if (!$businessId || !Business::find($businessId)) {
                jsonResponse(['message' => 'business_id inválido o no existe'], 400);
            }
            if ($day < 1 || $day > 7) {
                jsonResponse(['message' => 'day_of_week debe estar entre 1 y 7'], 400);
            }
            if (!validateTime($start) || !validateTime($end)) {
                jsonResponse(['message' => 'Formato de hora inválido (HH:MM)'], 400);
            }

            // Evitar duplicar exactamente la misma entrada de horario
            $exists = WorkSchedule::where('business_id', $businessId)
                ->where('day_of_week', $day)
                ->where('start_time', $start)
                ->where('end_time', $end)
                ->first();

            if ($exists) {
                jsonResponse($exists, 200);
            }

            $schedule = WorkSchedule::create([
                'business_id' => $businessId,
                'day_of_week' => $day,
                'start_time' => $start,
                'end_time' => $end,
            ]);
            jsonResponse($schedule, 201);
        }
        break;

    case 'agenda':
        if ($method === 'GET') {
            $businessId = $_GET['business_id'] ?? null;
            $date = $_GET['date'] ?? date('Y-m-d');
            $businessId = sanitizeInt($businessId);
            if (!$businessId || !Business::find($businessId)) {
                jsonResponse(['message' => 'business_id inválido o no existe'], 400);
            }
            if (!validateDate($date)) {
                jsonResponse(['message' => 'Formato de fecha inválido (YYYY-MM-DD)'], 400);
            }
            $appointments = Appointment::with(['service', 'user'])
                ->where('business_id', $businessId)
                ->where('date', $date)
                ->get();
            $dayOfWeek = date('N', strtotime($date));
            $schedules = WorkSchedule::where('business_id', $businessId)
                ->where('day_of_week', $dayOfWeek)
                ->get();
            jsonResponse([ 'date' => $date, 'schedules' => $schedules, 'appointments' => $appointments ]);
        }
        break;

    case 'appointments':
        if ($method === 'GET') {
            $userId = $_SESSION['user_id'] ?? null;
            if (!$userId) {
                jsonResponse(['message' => 'Inicie sesión para ver sus turnos.'], 401);
            }
            $appointments = Appointment::with(['business', 'service'])
                ->where('user_id', $userId)
                ->orderBy('date', 'asc')
                ->orderBy('time', 'asc')
                ->get();
            jsonResponse($appointments);
        }

        if ($method === 'POST') {
            $businessId = sanitizeInt($input['business_id'] ?? null);
            $serviceId = sanitizeInt($input['service_id'] ?? null);
            $userId = $_SESSION['user_id'] ?? null;
            $date = sanitizeString($input['date'] ?? date('Y-m-d'));
            $time = sanitizeString($input['time'] ?? '09:00');

            if (!$userId) {
                jsonResponse(['message' => 'Inicie sesión para reservar un turno.'], 401);
            }

            if (!$businessId || !$serviceId) {
                jsonResponse(['message' => 'business_id y service_id son obligatorios'], 400);
            }
            
            $business = Business::find($businessId);
            $service = Service::find($serviceId);
            $user = User::find($userId);

            if (!$business || !$service || !$user) {
                jsonResponse(['message' => 'IDs proporcionados no existen'], 404);
            }
            if (!validateDate($date) || !validateTime($time)) {
                jsonResponse(['message' => 'Fecha o hora en formato inválido'], 400);
            }

            $duration = $service->duration_minutes ?? 30;
            $reqStart = strtotime($date . ' ' . $time);
            $reqEnd = strtotime("+{$duration} minutes", $reqStart);

            // Validar que el turno no sea en el pasado
            if ($reqStart < time()) {
                jsonResponse(['message' => 'No puedes agendar un turno en una fecha u hora que ya ha pasado.'], 400);
            }

            // 1. Validar horario de atención del negocio
            $dayOfWeek = date('N', strtotime($date));
            $schedule = WorkSchedule::where('business_id', $businessId)
                ->where('day_of_week', $dayOfWeek)
                ->first();

            if (!$schedule) {
                jsonResponse(['message' => 'El negocio no atiende en el día seleccionado.'], 400);
            }

            $schedStart = strtotime($date . ' ' . $schedule->start_time);
            $schedEnd = strtotime($date . ' ' . $schedule->end_time);

            if ($reqStart < $schedStart || $reqEnd > $schedEnd) {
                $startFormatted = date('H:i', $schedStart);
                $endFormatted = date('H:i', $schedEnd);
                jsonResponse([
                    'message' => "El turno seleccionado está fuera del horario de atención ($startFormatted a $endFormatted) considerando la duración del servicio ($duration min)."
                ], 400);
            }

            // 2. Validar colisión o solapamiento con turnos existentes
            $existingAppointments = Appointment::where('business_id', $businessId)
                ->where('date', $date)
                ->whereIn('status', ['pending', 'completed'])
                ->with('service')
                ->get();

            foreach ($existingAppointments as $existing) {
                $existingStart = strtotime($date . ' ' . $existing->time);
                $existingDuration = $existing->service->duration_minutes ?? 30;
                $existingEnd = strtotime("+{$existingDuration} minutes", $existingStart);

                if ($reqStart < $existingEnd && $reqEnd > $existingStart) {
                    $conflictStart = date('H:i', $existingStart);
                    $conflictEnd = date('H:i', $existingEnd);
                    jsonResponse([
                        'message' => "El horario seleccionado coincide con otro turno reservado ($conflictStart a $conflictEnd)."
                    ], 409);
                }
            }

            $appointment = Appointment::create([
                'business_id' => $businessId,
                'service_id' => $serviceId,
                'user_id' => $userId,
                'date' => $date,
                'time' => $time,
                'status' => 'pending',
            ]);
            jsonResponse($appointment, 201);
        }

        if ($method === 'DELETE') {
            $id = $_GET['id'] ?? null;
            if (!$id) {
                jsonResponse(['message' => 'Falta id de turno'], 400);
            }
            $appointment = Appointment::find($id);
            if (!$appointment) {
                jsonResponse(['message' => 'Turno no encontrado'], 404);
            }

            // Validar que el turno pertenezca al usuario de la sesión actual
            $sessionUserId = $_SESSION['user_id'] ?? null;
            if ($appointment->user_id !== $sessionUserId) {
                jsonResponse(['message' => 'No autorizado para cancelar este turno.'], 403);
            }

            if ($appointment->status === 'cancelled') {
                jsonResponse(['message' => 'Este turno ya ha sido cancelado.'], 400);
            }
            if ($appointment->status === 'completed') {
                jsonResponse(['message' => 'No se puede cancelar un turno ya completado.'], 400);
            }

            // Validar restricción de 24 horas de anticipación
            $appointmentTime = strtotime($appointment->date . ' ' . $appointment->time);
            $now = time();
            $diffHours = ($appointmentTime - $now) / 3600;

            if ($diffHours < 24) {
                jsonResponse(['message' => 'Solo puedes cancelar turnos con al menos 24 horas de anticipación.'], 400);
            }

            $appointment->status = 'cancelled';
            $appointment->save();
            jsonResponse(['message' => 'Turno cancelado exitosamente', 'appointment' => $appointment]);
        }
        break;

    default:
        jsonResponse(['message' => 'Ruta no encontrada'], 404);
}
