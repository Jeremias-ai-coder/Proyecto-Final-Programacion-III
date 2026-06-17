<?php

namespace App\Controllers;

use App\Models\Business;
use App\Models\Appointment;
use App\Models\WorkSchedule;

class AgendaController
{
    public function handle($route, $method, $input)
    {
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
            $sessionUserId = $_SESSION['user_id'] ?? null;
            $sessionUserRole = $_SESSION['user_role'] ?? null;
            $business = Business::find($businessId);
            $isOwner = $business && $business->owner_id === $sessionUserId;

            $withRelations = ['service'];
            if ($isOwner || $sessionUserRole === 'administrator') {
                $withRelations[] = 'user';
            }

            $appointments = Appointment::with($withRelations)
                ->where('business_id', $businessId)
                ->where('date', $date)
                ->get();
            $dayOfWeek = date('N', strtotime($date));
            $schedules = WorkSchedule::where('business_id', $businessId)
                ->where('day_of_week', $dayOfWeek)
                ->get();
            jsonResponse([ 'date' => $date, 'schedules' => $schedules, 'appointments' => $appointments ]);
        }
    }
}
