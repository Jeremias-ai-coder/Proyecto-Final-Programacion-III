<?php

namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailerException;
use App\Models\Appointment;

class Mailer
{
    /**
     * Obtiene una instancia configurada de PHPMailer o null si no se configuran variables de entorno.
     */
    private static function getMailerInstance()
    {
        $host = $_ENV['SMTP_HOST'] ?? null;
        $port = $_ENV['SMTP_PORT'] ?? null;
        $user = $_ENV['SMTP_USER'] ?? null;
        $pass = $_ENV['SMTP_PASS'] ?? null;
        $from = $_ENV['SMTP_FROM'] ?? 'noreply@turnosya.com';
        $fromName = $_ENV['SMTP_FROM_NAME'] ?? 'Turnos Ya';

        if (!$host || !$user || !$pass) {
            return null; // Fallback a log / mail local
        }

        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = $host;
        $mail->SMTPAuth   = true;
        $mail->Username   = $user;
        $mail->Password   = $pass;
        $mail->SMTPSecure = $_ENV['SMTP_SECURE'] ?? PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = $port ?: 587;
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom($from, $fromName);
        return $mail;
    }

    /**
     * Envía un correo con fallback a log si falla o no está configurado.
     */
    public static function sendEmail($to, $toName, $subject, $htmlContent)
    {
        $mail = self::getMailerInstance();
        if ($mail) {
            try {
                $mail->addAddress($to, $toName);
                $mail->isHTML(true);
                $mail->Subject = $subject;
                $mail->Body    = $htmlContent;
                $mail->send();
                return true;
            } catch (MailerException $e) {
                self::logEmailFallback("Error de PHPMailer: " . $e->getMessage(), $to, $subject, $htmlContent);
            }
        } else {
            // Intenta usar mail() nativo
            $headers  = "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            $headers .= "From: " . ($_ENV['SMTP_FROM'] ?? 'noreply@turnosya.com') . "\r\n";
            
            $success = @mail($to, $subject, $htmlContent, $headers);
            if (!$success) {
                self::logEmailFallback("mail() nativo falló o deshabilitado.", $to, $subject, $htmlContent);
            } else {
                return true;
            }
        }
        return false;
    }

    /**
     * Guarda el correo en un archivo local para depuración si no hay servidor SMTP configurado.
     */
    private static function logEmailFallback($reason, $to, $subject, $htmlContent)
    {
        $logDir = __DIR__ . '/../../storage/logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0777, true);
        }
        $logFile = $logDir . '/mail.log';
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "==================================================\n";
        $logEntry .= "[{$timestamp}] FALLBACK MAIL: {$reason}\n";
        $logEntry .= "PARA: {$to}\n";
        $logEntry .= "ASUNTO: {$subject}\n";
        $logEntry .= "CONTENIDO HTML:\n{$htmlContent}\n";
        $logEntry .= "==================================================\n\n";
        @file_put_contents($logFile, $logEntry, FILE_APPEND);
    }

    /**
     * Envía email de confirmación de reserva
     */
    public static function sendAppointmentCreatedEmail(Appointment $appointment)
    {
        try {
            $appointment->load(['service', 'user', 'business']);
            $client = $appointment->user;
            if ($client && isset($client->email_notifications) && $client->email_notifications == 0) {
                return;
            }
            $business = $appointment->business;
            $service = $appointment->service;

            $dateFormatted = date('d/m/Y', strtotime($appointment->date));
            $timeFormatted = date('H:i', strtotime($appointment->time));

            $subject = "Confirmación de Turno - " . $business->name;
            $html = self::getEmailTemplate("¡Tu turno ha sido confirmado!", "
                <p>Hola <strong>{$client->name}</strong>,</p>
                <p>Te confirmamos que has agendado exitosamente tu turno en <strong>{$business->name}</strong>.</p>
                <div style='background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0;'>
                    <h3 style='margin-top: 0; color: #009ee3;'>Detalles del Turno</h3>
                    <table style='width: 100%; border-collapse: collapse;'>
                        <tr><td style='padding: 6px 0; color: #475569;'><strong>Servicio:</strong></td><td>{$service->name}</td></tr>
                        <tr><td style='padding: 6px 0; color: #475569;'><strong>Fecha:</strong></td><td>{$dateFormatted}</td></tr>
                        <tr><td style='padding: 6px 0; color: #475569;'><strong>Hora:</strong></td><td>{$timeFormatted} hs.</td></tr>
                        <tr><td style='padding: 6px 0; color: #475569;'><strong>Precio:</strong></td><td>\${$service->price}</td></tr>
                        " . ($business->address ? "<tr><td style='padding: 6px 0; color: #475569;'><strong>Dirección:</strong></td><td>{$business->address}</td></tr>" : "") . "
                    </table>
                </div>
                <p>Si necesitas realizar algún cambio o cancelar la cita, por favor hazlo desde la aplicación con al menos 24 horas de anticipación.</p>
            ");

            self::queueEmail($client->email, $client->name, $subject, $html);
        } catch (\Throwable $e) {
            // Silenciar errores para evitar romper flujo principal
        }
    }

    /**
     * Envía email de cancelación de reserva
     */
    public static function sendAppointmentCancelledEmail(Appointment $appointment, $cancelledByRole = 'client')
    {
        try {
            $appointment->load(['service', 'user', 'business']);
            $client = $appointment->user;
            if ($client && isset($client->email_notifications) && $client->email_notifications == 0) {
                return;
            }
            $business = $appointment->business;
            $service = $appointment->service;

            $dateFormatted = date('d/m/Y', strtotime($appointment->date));
            $timeFormatted = date('H:i', strtotime($appointment->time));

            $subject = "Turno Cancelado - " . $business->name;
            
            $origin = $cancelledByRole === 'client' ? 'por ti' : 'por el negocio';
            
            $html = self::getEmailTemplate("Tu turno ha sido cancelado", "
                <p>Hola <strong>{$client->name}</strong>,</p>
                <p>Te notificamos que el turno que tenías reservado en <strong>{$business->name}</strong> ha sido cancelado {$origin}.</p>
                <div style='background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 20px 0;'>
                    <h3 style='margin-top: 0; color: #b91c1c;'>Resumen del Turno Cancelado</h3>
                    <table style='width: 100%; border-collapse: collapse;'>
                        <tr><td style='padding: 6px 0; color: #475569;'><strong>Servicio:</strong></td><td>{$service->name}</td></tr>
                        <tr><td style='padding: 6px 0; color: #475569;'><strong>Fecha:</strong></td><td>{$dateFormatted}</td></tr>
                        <tr><td style='padding: 6px 0; color: #475569;'><strong>Hora:</strong></td><td>{$timeFormatted} hs.</td></tr>
                    </table>
                </div>
                <p>Lamentamos las molestias ocasionadas. Si lo deseas, puedes volver a agendar un nuevo turno ingresando a nuestra plataforma.</p>
            ");

            self::queueEmail($client->email, $client->name, $subject, $html);
        } catch (\Throwable $e) {
            // Silenciar
        }
    }

    /**
     * Retorna plantilla HTML estructurada
     */
    private static function getEmailTemplate($title, $bodyContent)
    {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                .header { background: linear-gradient(135deg, #009ee3, #0081bb); padding: 32px; text-align: center; color: white; }
                .content { padding: 32px; line-height: 1.6; }
                .footer { background-color: #f1f5f9; padding: 24px; text-align: center; font-size: 0.8rem; color: #64748b; }
            </style>
        </head>
        <body>
            <div style='background-color: #f8fafc; padding: 32px 0;'>
                <div class='container'>
                    <div class='header'>
                        <h1 style='margin: 0; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px;'>Turnos Ya</h1>
                    </div>
                    <div class='content'>
                        <h2 style='color: #1e293b; font-size: 1.3rem; margin-top: 0;'>{$title}</h2>
                        {$bodyContent}
                        <br>
                        <hr style='border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;'>
                        <p style='font-size: 0.9rem; color: #64748b;'>Atentamente,<br>El equipo de Turnos Ya</p>
                    </div>
                    <div class='footer'>
                        Este es un correo automático, por favor no respondas a este mensaje.<br>
                        &copy; " . date('Y') . " Turnos Ya. Todos los derechos reservados.
                    </div>
                </div>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Encola el correo electrónico en la base de datos y dispara el ejecutor.
     */
    private static function queueEmail($to, $toName, $subject, $htmlContent)
    {
        try {
            \App\Models\MailQueue::create([
                'recipient_email' => $to,
                'recipient_name' => $toName,
                'subject' => $subject,
                'body' => $htmlContent,
                'status' => 'pending',
                'attempts' => 0
            ]);

            self::triggerQueueProcessor();
            return true;
        } catch (\Throwable $e) {
            self::logEmailFallback("Fallo al encolar correo: " . $e->getMessage(), $to, $subject, $htmlContent);
            return false;
        }
    }

    /**
     * Ejecuta el procesador de cola en segundo plano (asíncronamente).
     */
    public static function triggerQueueProcessor()
    {
        try {
            $scriptPath = realpath(__DIR__ . '/../cron/process_mail_queue.php');
            if ($scriptPath) {
                $phpPath = 'C:\\xampp\\php\\php.exe';
                if (PHP_OS_FAMILY !== 'Windows' || !file_exists($phpPath)) {
                    $phpPath = 'php';
                }
                
                if (PHP_OS_FAMILY === 'Windows') {
                    // Ejecución en segundo plano silencioso en Windows
                    $cmd = "start /B " . escapeshellcmd($phpPath) . " " . escapeshellarg($scriptPath);
                    pclose(popen($cmd, "r"));
                } else {
                    // Ejecución en segundo plano silencioso en Unix/Linux
                    $cmd = escapeshellcmd($phpPath) . " " . escapeshellarg($scriptPath) . " > /dev/null 2>&1 &";
                    exec($cmd);
                }
            }
        } catch (\Throwable $e) {
            // Silenciar
        }
    }
}
