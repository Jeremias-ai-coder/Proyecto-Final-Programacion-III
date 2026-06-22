<?php

namespace App\Controllers;

use App\Models\MailQueue;
use App\Services\Mailer;

class MailQueueController
{
    public function handle($route, $method, $input)
    {
        // Validar permisos: sólo administrador
        $userRole = $_SESSION['user_role'] ?? null;
        if ($userRole !== 'administrator') {
            jsonResponse(['message' => 'No autorizado'], 403);
        }

        if ($method === 'GET') {
            // Devolver todos los correos ordenados de más nuevos a más viejos
            $query = MailQueue::orderBy('created_at', 'desc');
            jsonResponse($query->get());
        }

        if ($method === 'POST') {
            $action = sanitizeString($input['action'] ?? '');
            
            if ($action === 'retry') {
                $id = sanitizeInt($input['id'] ?? null);
                if (!$id) {
                    jsonResponse(['message' => 'Falta el id del correo'], 400);
                }

                $mail = MailQueue::find($id);
                if (!$mail) {
                    jsonResponse(['message' => 'Correo no encontrado'], 404);
                }

                // Reiniciar intentos, marcar como pending, y vaciar mensaje de error anterior
                $mail->update([
                    'status' => 'pending',
                    'attempts' => 0,
                    'error_message' => null
                ]);

                // Disparar procesador asíncrono
                Mailer::triggerQueueProcessor();

                jsonResponse($mail);
            } else {
                jsonResponse(['message' => 'Acción no válida'], 400);
            }
        }

        if ($method === 'DELETE') {
            // Eliminar correos procesados o todos los correos
            $type = $_GET['type'] ?? 'processed';

            if ($type === 'all') {
                // MySQL truncate o delete
                MailQueue::query()->delete();
            } else {
                // Eliminar enviados ('sent') o con errores repetidos ('failed')
                MailQueue::whereIn('status', ['sent', 'failed'])->delete();
            }

            jsonResponse(['message' => 'Cola de correos depurada correctamente.']);
        }
    }
}
