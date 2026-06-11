<?php

namespace App\Security;

class RateLimiter
{
    private string $storageDir;
    private int $maxRequests;
    private int $decaySeconds;

    public function __construct(int $maxRequests = 60, int $decaySeconds = 60)
    {
        $this->maxRequests = $maxRequests;
        $this->decaySeconds = $decaySeconds;
        // Carpeta temporal del sistema
        $this->storageDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'turnos_ya_rate_limits';
        
        if (!is_dir($this->storageDir)) {
            mkdir($this->storageDir, 0777, true);
        }
    }

    public function getClientIp(): string
    {
        // Detectar si la petición viene detrás del proxy de Cloudflare
        if (isset($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            return $_SERVER['HTTP_CF_CONNECTING_IP'];
        }
        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }

    public function check(string $key): array
    {
        $hash = md5($key);
        $file = $this->storageDir . DIRECTORY_SEPARATOR . $hash . '.json';
        $now = time();

        if (file_exists($file)) {
            $data = json_decode(@file_get_contents($file), true);
            if ($data && $data['reset_time'] > $now) {
                // Sigue en la misma ventana de tiempo
                $data['requests']++;
                file_put_contents($file, json_encode($data));
                
                $remaining = max(0, $this->maxRequests - $data['requests']);
                $isBlocked = $data['requests'] > $this->maxRequests;
                $retryAfter = $isBlocked ? ($data['reset_time'] - $now) : 0;

                return [
                    'allowed' => !$isBlocked,
                    'remaining' => $remaining,
                    'retry_after' => $retryAfter
                ];
            }
        }

        // Crear nueva ventana de tiempo
        $data = [
            'requests' => 1,
            'reset_time' => $now + $this->decaySeconds
        ];
        file_put_contents($file, json_encode($data));

        return [
            'allowed' => true,
            'remaining' => $this->maxRequests - 1,
            'retry_after' => 0
        ];
    }
}
