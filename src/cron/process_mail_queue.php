<?php

// Asegurar que no se exceda el tiempo límite de ejecución
set_time_limit(120);

require_once __DIR__ . '/../bootstrap.php';

use App\Models\MailQueue;
use App\Services\Mailer;

try {
    // Buscar correos pendientes o fallidos con menos de 3 intentos
    $queueItems = MailQueue::whereIn('status', ['pending', 'failed'])
        ->where('attempts', '<', 3)
        ->orderBy('created_at', 'asc')
        ->limit(10)
        ->get();

    if ($queueItems->isEmpty()) {
        exit(0);
    }

    foreach ($queueItems as $item) {
        $item->attempts += 1;
        $item->save();

        try {
            $success = Mailer::sendEmail(
                $item->recipient_email,
                $item->recipient_name,
                $item->subject,
                $item->body
            );

            if ($success) {
                $item->status = 'sent';
                $item->error_message = null;
            } else {
                $item->status = 'failed';
                $item->error_message = 'Failed to send via Mailer/SMTP. Check mail logs.';
            }
        } catch (\Throwable $e) {
            $item->status = 'failed';
            $item->error_message = $e->getMessage();
            writeLog("Error procesando email ID {$item->id}: " . $e->getMessage() . "\n" . $e->getTraceAsString());
        }

        $item->save();
    }

} catch (\Throwable $e) {
    writeLog("Error general en el procesador de cola de correo: " . $e->getMessage());
    exit(1);
}
