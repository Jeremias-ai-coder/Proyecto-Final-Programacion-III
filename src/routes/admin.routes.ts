import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authGuard } from '../middlewares/authGuard';
import { AppError } from '../middlewares/errorHandler';
import bcrypt from 'bcrypt';

const router = Router();
const prisma = new PrismaClient();

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'administrator') {
    throw new AppError('Acceso denegado: se requiere rol de administrador', 403);
  }
  next();
};

// GET /api/v1/admin/users — Listar todos los usuarios (admin only)
router.get('/users', authGuard, requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, phone: true }
  });
  res.json({ data: users, meta: { total: users.length } });
});

// PATCH /api/v1/admin/users/:id/role — Cambiar rol de usuario (admin only)
router.patch('/users/:id/role', authGuard, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['client', 'owner', 'administrator'].includes(role)) {
    throw new AppError('Rol inválido', 400);
  }
  const user = await prisma.user.update({ where: { id: parseInt(id) }, data: { role } });
  res.json({ id: user.id, name: user.name, role: user.role });
});

// DELETE /api/v1/admin/users/:id — Eliminar usuario (admin only)
router.delete('/users/:id', authGuard, requireAdmin, async (req, res) => {
  const { id } = req.params;
  await prisma.user.delete({ where: { id: parseInt(id) } });
  res.json({ message: 'Usuario eliminado correctamente' });
});

// GET /api/v1/admin/stats — Estadísticas globales
router.get('/stats', authGuard, requireAdmin, async (req, res) => {
  const [totalUsers, totalBusinesses, totalAppointments, totalAdmins] = await Promise.all([
    prisma.user.count(),
    prisma.business.count(),
    prisma.appointment.count(),
    prisma.user.count({ where: { role: 'administrator' } })
  ]);
  res.json({ totalUsers, totalBusinesses, totalAppointments, totalAdmins });
});

// GET /api/v1/admin/appointments — Todos los turnos del sistema
router.get('/appointments', authGuard, requireAdmin, async (req, res) => {
  const appointments = await prisma.appointment.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      business: { select: { id: true, name: true } },
      service: { select: { id: true, name: true, price: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json({ data: appointments, meta: { total: appointments.length } });
});

export default router;
