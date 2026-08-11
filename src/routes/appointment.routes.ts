import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller';
import { authGuard } from '../middlewares/authGuard';

const router = Router();

router.use(authGuard); // Todas las rutas de turnos requieren auth

router.get('/', AppointmentController.getAppointments);
router.post('/', AppointmentController.createAppointment);
router.post('/hold', AppointmentController.holdAppointment);
router.patch('/:id/cancel', AppointmentController.cancelAppointment);

export default router;
