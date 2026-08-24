import { Router } from 'express';
import { businessController, serviceController, scheduleController } from '../container';
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

export default router;
