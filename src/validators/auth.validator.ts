import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido y debe ser mayor a 2 caracteres'),
  email: z.string().email('Debe ser un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

export const loginSchema = z.object({
  email: z.string().email('Debe ser un correo electrónico válido'),
  password: z.string().min(1, 'La contraseña es requerida')
});
