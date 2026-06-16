<?php

namespace App\Controllers;

use App\Models\WorkSchedule;
use App\Models\Business;

class ScheduleController
{
    public function handle($route, $method, $input)
    {
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

        if ($method === 'DELETE') {
            $id = $_GET['id'] ?? null;
            if (!$id) {
                jsonResponse(['message' => 'Falta el id del horario'], 400);
            }
            $schedule = WorkSchedule::find($id);
            if (!$schedule) {
                jsonResponse(['message' => 'Horario no encontrado'], 404);
            }

            // Validar permisos
            $userId = $_SESSION['user_id'] ?? null;
            $userRole = $_SESSION['user_role'] ?? null;
            $business = Business::find($schedule->business_id);
            if (!$business || ($business->owner_id !== $userId && $userRole !== 'administrator')) {
                jsonResponse(['message' => 'No tienes permisos para eliminar este horario.'], 403);
            }

            $schedule->delete();
            jsonResponse(['message' => 'Horario de atención eliminado correctamente']);
        }
    }
}
