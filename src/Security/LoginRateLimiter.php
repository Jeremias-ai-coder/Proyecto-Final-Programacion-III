<?php

namespace App\Security;

class LoginRateLimiter
{
    private string $storageDir;
    private int $maxAttempts;
    private int $lockoutSeconds;

    public function __construct(int $maxAttempts = 5, int $lockoutSeconds = 900) // 5 intentos, bloqueo de 15 minutos (900 seg)
    {
        $this->maxAttempts = $maxAttempts;
        $this->lockoutSeconds = $lockoutSeconds;
        $this->storageDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'turnos_ya_login_locks';
        
        if (!is_dir($this->storageDir)) {
            @mkdir($this->storageDir, 0777, true);
        }
    }

    private function getFilePath(string $email): string
    {
        return $this->storageDir . DIRECTORY_SEPARATOR . md5(strtolower(trim($email))) . '.json';
    }

    public function isLocked(string $email): array
    {
        $file = $this->getFilePath($email);
        $now = time();

        if (file_exists($file)) {
            $data = json_decode(@file_get_contents($file), true);
            if ($data && isset($data['locked_until']) && $data['locked_until'] > $now) {
                return [
                    'locked' => true,
                    'remaining_seconds' => $data['locked_until'] - $now
                ];
            }
        }

        return [
            'locked' => false,
            'remaining_seconds' => 0
        ];
    }

    public function registerFailedAttempt(string $email): int
    {
        $file = $this->getFilePath($email);
        $now = time();
        $attempts = 1;
        $lockedUntil = 0;

        if (file_exists($file)) {
            $data = json_decode(@file_get_contents($file), true);
            if ($data) {
                // Si la ventana de intentos ya expiró desde el primer fallo, reiniciamos contador
                if (isset($data['reset_time']) && $data['reset_time'] < $now) {
                    $attempts = 1;
                } else {
                    $attempts = ($data['attempts'] ?? 0) + 1;
                }
            }
        }

        // Ventana de 15 minutos para acumular intentos fallidos desde este momento si es el primer fallo,
        // o mantiene el tiempo de reinicio existente.
        $resetTime = (file_exists($file) && isset($data['reset_time'])) ? $data['reset_time'] : ($now + 900);

        if ($attempts >= $this->maxAttempts) {
            $lockedUntil = $now + $this->lockoutSeconds;
        }

        $data = [
            'email' => strtolower(trim($email)),
            'attempts' => $attempts,
            'reset_time' => $resetTime,
            'locked_until' => $lockedUntil
        ];

        @file_put_contents($file, json_encode($data));
        return $attempts;
    }

    public function resetAttempts(string $email): void
    {
        $file = $this->getFilePath($email);
        if (file_exists($file)) {
            @unlink($file);
        }
    }
}
