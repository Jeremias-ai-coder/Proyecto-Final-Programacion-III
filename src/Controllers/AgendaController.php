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
    }
}
