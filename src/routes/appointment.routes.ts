import { Router } from 'express';
import { appointmentController } from '../container';
import { authGuard } from '../middlewares/authGuard';

const router = Router();

router.use(authGuard); // Todas las rutas de turnos requieren auth

router.get('/', appointmentController.getAppointments);
router.post('/', appointmentController.createAppointment);
router.post('/hold', appointmentController.holdAppointment);
router.patch('/:id/cancel', appointmentController.cancelAppointment);

export default router;
