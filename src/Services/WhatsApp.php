<?php

namespace App\Services;

class WhatsApp
{
    /**
     * Envía una notificación por WhatsApp (enviando a Twilio o registrando en fallback log).
     */
    public static function sendWhatsAppNotification($toPhone, $message)
    {
        if (empty($toPhone)) {
            return false;
        }

        // Obtener credenciales de Twilio
        $sid = $_ENV['TWILIO_SID'] ?? null;
        $token = $_ENV['TWILIO_TOKEN'] ?? null;
        $fromNumber = $_ENV['TWILIO_WHATSAPP_NUMBER'] ?? null; // Ej: whatsapp:+14155238886

        if ($sid && $token && $fromNumber) {
            try {
                // Lógica real usando cURL para evitar dependencias extras de Twilio SDK
                $url = "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json";
                $data = [
                    'From' => $fromNumber,
                    'To' => "whatsapp:" . $toPhone,
                    'Body' => $message
                ];

                $ch = curl_init($url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
                curl_setopt($ch, CURLOPT_USERPWD, "{$sid}:{$token}");
                curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode >= 200 && $httpCode < 300) {
                    return true;
                } else {
                    self::logWhatsAppFallback("Twilio API devolvió código {$httpCode}. Respuesta: " . $response, $toPhone, $message);
                }
            } catch (\Exception $e) {
                self::logWhatsAppFallback("Excepción al conectar con Twilio: " . $e->getMessage(), $toPhone, $message);
            }
        } else {
            self::logWhatsAppFallback("Credenciales de Twilio no configuradas en .env.", $toPhone, $message);
        }
        return false;
    }

    /**
     * Guarda el mensaje de WhatsApp en un archivo local para depuración.
     */
    private static function logWhatsAppFallback($reason, $toPhone, $message)
    {
        $logDir = __DIR__ . '/../../storage/logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0777, true);
        }
        $logFile = $logDir . '/whatsapp.log';
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "==================================================\n";
        $logEntry .= "[{$timestamp}] FALLBACK WHATSAPP: {$reason}\n";
        $logEntry .= "PARA: {$toPhone}\n";
        $logEntry .= "MENSAJE:\n{$message}\n";
        $logEntry .= "==================================================\n\n";
        @file_put_contents($logFile, $logEntry, FILE_APPEND);
    }
}
