<?php

namespace App\Controllers;

use App\Models\Notification;

class NotificationController
{
    public function handle($route, $method, $input)
    {
        $userId = $_SESSION['user_id'] ?? null;
        if (!$userId) {
            jsonResponse(['message' => 'No autorizado'], 401);
        }

        if ($method === 'GET') {
            $notifications = Notification::where('user_id', $userId)
                ->orderBy('created_at', 'desc')
                ->limit(40)
                ->get();
            jsonResponse($notifications);
        }

        if ($method === 'PUT') {
            $id = $input['id'] ?? null;
            if ($id === 'all') {
                Notification::where('user_id', $userId)->update(['is_read' => 1]);
                jsonResponse(['message' => 'Todas las notificaciones marcadas como leídas']);
            } elseif ($id !== null) {
                $id = sanitizeInt($id);
                $notification = Notification::where('user_id', $userId)->where('id', $id)->first();
                if ($notification) {
                    $notification->is_read = 1;
                    $notification->save();
                    jsonResponse($notification);
                } else {
                    jsonResponse(['message' => 'Notificación no encontrada'], 404);
                }
            } else {
                jsonResponse(['message' => 'Falta id de notificación'], 400);
            }
        }
    }
}
