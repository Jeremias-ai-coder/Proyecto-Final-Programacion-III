import { Router } from 'express';
import { appointmentController, reviewController } from '../container';
import { authGuard } from '../middlewares/authGuard';

const router = Router();

router.use(authGuard); // Todas las rutas de turnos requieren auth

router.get('/', appointmentController.getAppointments);
router.get('/:id', appointmentController.getAppointmentById);
router.post('/', appointmentController.createAppointment);
router.post('/hold', appointmentController.holdAppointment);
router.patch('/:id/cancel', appointmentController.cancelAppointment);
router.patch('/:id/status', appointmentController.updateStatus);
router.post('/:id/reviews', reviewController.createReview);

export default router;
