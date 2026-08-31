import { Router } from 'express';
import { businessController, serviceController, scheduleController, reviewController, appointmentController } from '../container';
import { authGuard } from '../middlewares/authGuard';

const router = Router();

router.get('/', businessController.getBusinesses);
router.post('/', authGuard, businessController.createBusiness);
router.get('/my', authGuard, businessController.getMyBusinesses);
router.get('/:id', businessController.getBusiness);
router.patch('/:id', authGuard, businessController.updateBusiness);

// Servicios dependientes del negocio
router.get('/:id/services', serviceController.getServices);
router.post('/:id/services', authGuard, serviceController.createService);
router.delete('/:id/services/:serviceId', authGuard, serviceController.deleteService);

// Horarios dependientes del negocio
router.get('/:id/schedules', scheduleController.getSchedules);
router.post('/:id/schedules', authGuard, scheduleController.createSchedule);
router.delete('/:id/schedules/:scheduleId', authGuard, scheduleController.deleteSchedule);

// Horarios ocupados del negocio para una fecha
router.get('/:id/busy-slots', appointmentController.getBusySlots);

// Reseñas del negocio
router.get('/:id/reviews', reviewController.getBusinessReviews);

export default router;
