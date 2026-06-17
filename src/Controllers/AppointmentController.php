<?php

namespace App\Controllers;

use App\Models\Appointment;
use App\Models\Business;
use App\Models\Service;
use App\Models\User;
use App\Models\WorkSchedule;
use App\Models\Notification;
use App\Services\Mailer;
use App\Services\WhatsApp;

class AppointmentController
{
    public function handle($route, $method, $input)
    {
        if ($method === 'GET') {
            $userId = $_SESSION['user_id'] ?? null;
            if (!$userId) {
                jsonResponse(['message' => 'Inicie sesión para ver sus turnos.'], 401);
            }
            // Autocompletar turnos pasados del usuario de forma eficiente
            $today = date('Y-m-d');
            Appointment::where('user_id', $userId)
                ->where('status', 'pending')
                ->where('date', '<', $today)
                ->update(['status' => 'completed']);

            $todayAppts = Appointment::where('user_id', $userId)
                ->where('status', 'pending')
                ->where('date', $today)
                ->with('service')
                ->get();
            $now = time();
            foreach ($todayAppts as $appt) {
                $duration = $appt->service ? $appt->service->duration_minutes : 30;
                $apptTime = strtotime($today . ' ' . $appt->time);
                $endTime = strtotime("+{$duration} minutes", $apptTime);
                if ($endTime < $now) {
                    $appt->status = 'completed';
                    $appt->save();
                }
            }
            $query = Appointment::with(['business', 'service', 'review'])
                ->where('user_id', $userId)
                ->orderBy('date', 'asc')
                ->orderBy('time', 'asc');

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

            $appointments = $query->get();
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

            // Crear notificaciones In-App
            try {
                Notification::create([
                    'user_id' => $userId,
                    'title' => 'Turno Agendado',
                    'message' => 'Has agendado un turno en ' . $business->name . ' para el ' . date('d/m/Y', strtotime($date)) . ' a las ' . date('H:i', strtotime($time)) . ' hs.',
                    'type' => 'success',
                    'is_read' => 0
                ]);
                
                Notification::create([
                    'user_id' => $business->owner_id,
                    'title' => 'Nueva Reserva',
                    'message' => 'El cliente ' . $user->name . ' reservó un turno para ' . $service->name . ' el ' . date('d/m/Y', strtotime($date)) . ' a las ' . date('H:i', strtotime($time)) . ' hs.',
                    'type' => 'info',
                    'is_read' => 0
                ]);
            } catch (\Throwable $notifEx) {
                // Silenciar errores de notificación para no romper la reserva
            }

            // Enviar correo de confirmación
            try {
                Mailer::sendAppointmentCreatedEmail($appointment);
            } catch (\Throwable $mailEx) {
                // Silenciar
            }

            // Enviar WhatsApp de confirmación
            try {
                if ($user->phone && $user->whatsapp_notifications == 1) {
                    $dateFormatted = date('d/m/Y', strtotime($date));
                    $timeFormatted = date('H:i', strtotime($time));
                    $msg = "Hola {$user->name}, tu turno en {$business->name} para el servicio {$service->name} ha sido reservado para el {$dateFormatted} a las {$timeFormatted} hs.";
                    WhatsApp::sendWhatsAppNotification($user->phone, $msg);
                }
            } catch (\Throwable $waEx) {
                // Silenciar
            }

            jsonResponse($appointment, 201);
        }

        if ($method === 'PUT') {
            $id = sanitizeInt($input['id'] ?? null);
            $status = sanitizeString($input['status'] ?? '');

            if (!$id || !$status) {
                jsonResponse(['message' => 'Falta id de turno o status'], 400);
            }

            $appointment = Appointment::find($id);
            if (!$appointment) {
                jsonResponse(['message' => 'Turno no encontrado'], 404);
            }

            if ($appointment->status === 'cancelled') {
                jsonResponse(['message' => 'Este turno ya ha sido cancelado.'], 400);
            }
            if ($appointment->status === 'completed') {
                jsonResponse(['message' => 'No se puede modificar un turno ya completado.'], 400);
            }

            $sessionUserId = $_SESSION['user_id'] ?? null;
            $sessionUserRole = $_SESSION['user_role'] ?? null;
            $business = Business::find($appointment->business_id);
            $isOwner = $business && $business->owner_id === $sessionUserId;
            $isStaff = $business && \App\Models\BusinessStaff::where('business_id', $business->id)->where('user_id', $sessionUserId)->exists();
            $isManager = $isOwner || $isStaff;
            $isClient = $appointment->user_id === $sessionUserId;

            if (!$isManager && !$isClient && $sessionUserRole !== 'administrator') {
                jsonResponse(['message' => 'No autorizado para modificar este turno.'], 403);
            }

            if (!in_array($status, ['pending', 'completed', 'cancelled'])) {
                jsonResponse(['message' => 'Estado de turno inválido'], 400);
            }

            // Restricción de transiciones para clientes
            if ($isClient && !$isManager && $sessionUserRole !== 'administrator') {
                if ($status !== 'cancelled') {
                    jsonResponse(['message' => 'Los clientes solo pueden cancelar turnos.'], 403);
                }
            }

            // Validar restricción de 24 horas para cancelación
            if ($status === 'cancelled') {
                if (!$isManager && $sessionUserRole !== 'administrator') {
                    $dateStr = $appointment->date instanceof \DateTimeInterface ? $appointment->date->format('Y-m-d') : (string)$appointment->date;
                    $appointmentTime = strtotime($dateStr . ' ' . $appointment->time);
                    $now = time();
                    $diffHours = ($appointmentTime - $now) / 3600;

                    if ($diffHours < 24) {
                        jsonResponse(['message' => 'Solo puedes cancelar turnos con al menos 24 horas de anticipación.'], 400);
                    }
                }
            }

            $oldStatus = $appointment->status;
            $appointment->status = $status;
            $appointment->save();

            // Si el estado cambió, enviar notificaciones
            if ($oldStatus !== $status) {
                try {
                    $appointment->load(['service', 'user']);
                    if ($status === 'cancelled') {
                        if ($sessionUserId === $appointment->user_id) {
                            Notification::create([
                                'user_id' => $appointment->user_id,
                                'title' => 'Turno Cancelado',
                                'message' => 'Has cancelado tu turno en ' . $business->name . ' del ' . date('d/m/Y', strtotime($appointment->date)) . ' a las ' . date('H:i', strtotime($appointment->time)) . ' hs.',
                                'type' => 'warning',
                                'is_read' => 0
                            ]);
                            Notification::create([
                                'user_id' => $business->owner_id,
                                'title' => 'Turno Cancelado por Cliente',
                                'message' => 'El cliente ' . $appointment->user->name . ' canceló su turno para ' . $appointment->service->name . ' del ' . date('d/m/Y', strtotime($appointment->date)) . ' a las ' . date('H:i', strtotime($appointment->time)) . ' hs.',
                                'type' => 'danger',
                                'is_read' => 0
                            ]);
                        } else {
                            Notification::create([
                                'user_id' => $appointment->user_id,
                                'title' => 'Turno Cancelado por Negocio',
                                'message' => 'Tu turno en ' . $business->name . ' del ' . date('d/m/Y', strtotime($appointment->date)) . ' a las ' . date('H:i', strtotime($appointment->time)) . ' hs ha sido cancelado por el negocio.',
                                'type' => 'danger',
                                'is_read' => 0
                            ]);
                            Notification::create([
                                'user_id' => $business->owner_id,
                                'title' => 'Turno Cancelado',
                                'message' => 'Has cancelado el turno de ' . $appointment->user->name . ' del ' . date('d/m/Y', strtotime($appointment->date)) . ' a las ' . date('H:i', strtotime($appointment->time)) . ' hs.',
                                'type' => 'warning',
                                'is_read' => 0
                            ]);
                        }

                        // Enviar email de cancelación
                        try {
                            Mailer::sendAppointmentCancelledEmail($appointment, $sessionUserId === $appointment->user_id ? 'client' : 'owner');
                        } catch (\Throwable $mailEx) {}

                        // Enviar WhatsApp de cancelación
                        try {
                            $client = $appointment->user;
                            if ($client->phone && $client->whatsapp_notifications == 1) {
                                $origin = $sessionUserId === $appointment->user_id ? 'por ti' : 'por el negocio';
                                $dateFormatted = date('d/m/Y', strtotime($appointment->date));
                                $timeFormatted = date('H:i', strtotime($appointment->time));
                                $msg = "Hola {$client->name}, tu turno en {$business->name} reservado para el {$dateFormatted} a las {$timeFormatted} hs ha sido cancelado {$origin}.";
                                WhatsApp::sendWhatsAppNotification($client->phone, $msg);
                            }
                        } catch (\Throwable $waEx) {}
                    } elseif ($status === 'completed') {
                        Notification::create([
                            'user_id' => $appointment->user_id,
                            'title' => 'Turno Completado',
                            'message' => 'Tu turno en ' . $business->name . ' ha sido completado. ¡Gracias por tu visita!',
                            'type' => 'success',
                            'is_read' => 0
                        ]);
                    }
                } catch (\Throwable $notifEx) {
                    // Silenciar
                }
            }

            jsonResponse($appointment);
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

            // Validar que el turno pertenezca al cliente o que sea el dueño del negocio o un administrador
            $sessionUserId = $_SESSION['user_id'] ?? null;
            $sessionUserRole = $_SESSION['user_role'] ?? null;
            $business = Business::find($appointment->business_id);
            $isOwner = $business && $business->owner_id === $sessionUserId;
            $isStaff = $business && \App\Models\BusinessStaff::where('business_id', $business->id)->where('user_id', $sessionUserId)->exists();
            $isManager = $isOwner || $isStaff;

            if ($appointment->user_id !== $sessionUserId && !$isManager && $sessionUserRole !== 'administrator') {
                jsonResponse(['message' => 'No autorizado para cancelar este turno.'], 403);
            }

            if ($appointment->status === 'cancelled') {
                jsonResponse(['message' => 'Este turno ya ha sido cancelado.'], 400);
            }
            if ($appointment->status === 'completed') {
                jsonResponse(['message' => 'No se puede cancelar un turno ya completado.'], 400);
            }

            // Validar restricción de 24 horas de anticipación (solo aplica a clientes comunes, no al dueño ni administradores)
            if (!$isManager && $sessionUserRole !== 'administrator') {
                $dateStr = $appointment->date instanceof \DateTimeInterface ? $appointment->date->format('Y-m-d') : (string)$appointment->date;
                $appointmentTime = strtotime($dateStr . ' ' . $appointment->time);
                $now = time();
                $diffHours = ($appointmentTime - $now) / 3600;

                if ($diffHours < 24) {
                    jsonResponse(['message' => 'Solo puedes cancelar turnos con al menos 24 horas de anticipación.'], 400);
                }
            }

            $appointment->status = 'cancelled';
            $appointment->save();

            try {
                $appointment->load(['service', 'user']);
                if ($sessionUserId === $appointment->user_id) {
                    Notification::create([
                        'user_id' => $appointment->user_id,
                        'title' => 'Turno Cancelado',
                        'message' => 'Has cancelado tu turno en ' . $business->name . ' del ' . date('d/m/Y', strtotime($appointment->date)) . ' a las ' . date('H:i', strtotime($appointment->time)) . ' hs.',
                        'type' => 'warning',
                        'is_read' => 0
                    ]);
                    Notification::create([
                        'user_id' => $business->owner_id,
                        'title' => 'Turno Cancelado por Cliente',
                        'message' => 'El cliente ' . $appointment->user->name . ' canceló su turno para ' . $appointment->service->name . ' del ' . date('d/m/Y', strtotime($appointment->date)) . ' a las ' . date('H:i', strtotime($appointment->time)) . ' hs.',
                        'type' => 'danger',
                        'is_read' => 0
                    ]);
                } else {
                    Notification::create([
                        'user_id' => $appointment->user_id,
                        'title' => 'Turno Cancelado por Negocio',
                        'message' => 'Tu turno en ' . $business->name . ' del ' . date('d/m/Y', strtotime($appointment->date)) . ' a las ' . date('H:i', strtotime($appointment->time)) . ' hs ha sido cancelado por el negocio.',
                        'type' => 'danger',
                        'is_read' => 0
                    ]);
                    Notification::create([
                        'user_id' => $business->owner_id,
                        'title' => 'Turno Cancelado',
                        'message' => 'Has cancelado el turno de ' . $appointment->user->name . ' del ' . date('d/m/Y', strtotime($appointment->date)) . ' a las ' . date('H:i', strtotime($appointment->time)) . ' hs.',
                        'type' => 'warning',
                        'is_read' => 0
                    ]);
                }
            } catch (\Throwable $notifEx) {
                // Silenciar
            }

            // Enviar email de cancelación
            try {
                Mailer::sendAppointmentCancelledEmail($appointment, $sessionUserId === $appointment->user_id ? 'client' : 'owner');
            } catch (\Throwable $mailEx) {}

            // Enviar WhatsApp de cancelación
            try {
                $client = $appointment->user;
                if ($client->phone && $client->whatsapp_notifications == 1) {
                    $origin = $sessionUserId === $appointment->user_id ? 'por ti' : 'por el negocio';
                    $dateFormatted = date('d/m/Y', strtotime($appointment->date));
                    $timeFormatted = date('H:i', strtotime($appointment->time));
                    $msg = "Hola {$client->name}, tu turno en {$business->name} reservado para el {$dateFormatted} a las {$timeFormatted} hs ha sido cancelado {$origin}.";
                    WhatsApp::sendWhatsAppNotification($client->phone, $msg);
                }
            } catch (\Throwable $waEx) {}

            jsonResponse(['message' => 'Turno cancelado exitosamente', 'appointment' => $appointment]);
        }
    }
}
