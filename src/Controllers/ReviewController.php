<?php

namespace App\Controllers;

use App\Models\Review;
use App\Models\Appointment;

class ReviewController
{
    public function handle($route, $method, $input)
    {
        if ($method === 'GET') {
            $businessId = isset($_GET['business_id']) ? sanitizeInt($_GET['business_id']) : null;
            if (!$businessId) {
                jsonResponse(['message' => 'Falta el id del negocio'], 400);
            }
            // Obtener todas las reviews del negocio
            $reviews = Review::whereHas('appointment', function ($q) use ($businessId) {
                $q->where('business_id', $businessId);
            })
            ->join('appointments', 'reviews.appointment_id', '=', 'appointments.id')
            ->join('users', 'appointments.user_id', '=', 'users.id')
            ->select('reviews.*', 'users.name as user_name', 'appointments.date as appointment_date')
            ->orderBy('reviews.created_at', 'desc')
            ->get();
            jsonResponse($reviews);
        }

        if ($method === 'POST') {
            $userId = $_SESSION['user_id'] ?? null;
            if (!$userId) {
                jsonResponse(['message' => 'Inicie sesión para calificar el servicio.'], 401);
            }
            $appointmentId = sanitizeInt($input['appointment_id'] ?? null);
            $rating = sanitizeInt($input['rating'] ?? null);
            $comment = sanitizeString($input['comment'] ?? null);
            if (!$appointmentId) {
                jsonResponse(['message' => 'Falta el id del turno'], 400);
            }
            if ($rating === null || $rating < 1 || $rating > 5) {
                jsonResponse(['message' => 'La calificación debe estar entre 1 y 5 estrellas'], 400);
            }
            $appointment = Appointment::with('service')->find($appointmentId);
            if (!$appointment) {
                jsonResponse(['message' => 'Turno no encontrado'], 404);
            }
            if ($appointment->user_id !== $userId) {
                jsonResponse(['message' => 'No autorizado para calificar este turno.'], 403);
            }
            $duration = $appointment->service ? $appointment->service->duration_minutes : 30;
            $dateStr = $appointment->date instanceof \DateTimeInterface ? $appointment->date->format('Y-m-d') : (string)$appointment->date;
            $apptTime = strtotime($dateStr . ' ' . $appointment->time);
            $endTime = strtotime("+{$duration} minutes", $apptTime);
            if ($appointment->status !== 'completed' && $endTime >= time()) {
                jsonResponse(['message' => 'Solo puedes calificar un turno que ya haya concluido.'], 400);
            }
            if ($appointment->status === 'cancelled') {
                jsonResponse(['message' => 'No se puede calificar un turno cancelado.'], 400);
            }
            $existingReview = Review::where('appointment_id', $appointmentId)->first();
            if ($existingReview) {
                jsonResponse(['message' => 'Este turno ya ha sido calificado.'], 400);
            }
            if ($appointment->status === 'pending') {
                $appointment->status = 'completed';
                $appointment->save();
            }
            $review = Review::create([
                'appointment_id' => $appointmentId,
                'rating' => $rating,
                'comment' => $comment !== '' ? $comment : null,
            ]);
            jsonResponse($review, 201);
        }
    }
}
