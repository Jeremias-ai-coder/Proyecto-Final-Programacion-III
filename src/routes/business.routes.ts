import { Router } from 'express';
import { BusinessController } from '../controllers/business.controller';
import { ServiceController } from '../controllers/service.controller';
import { ScheduleController } from '../controllers/schedule.controller';
import { authGuard } from '../middlewares/authGuard';

const router = Router();

router.get('/', BusinessController.getBusinesses);
router.post('/', authGuard, BusinessController.createBusiness);
router.get('/my', authGuard, BusinessController.getMyBusinesses);
router.get('/:id', BusinessController.getBusiness);
router.patch('/:id', authGuard, BusinessController.updateBusiness);

// Servicios dependientes del negocio
router.get('/:id/services', ServiceController.getServices);
router.post('/:id/services', authGuard, ServiceController.createService);
router.delete('/:id/services/:serviceId', authGuard, ServiceController.deleteService);

// Horarios dependientes del negocio
router.get('/:id/schedules', ScheduleController.getSchedules);
router.post('/:id/schedules', authGuard, ScheduleController.createSchedule);
router.delete('/:id/schedules/:scheduleId', authGuard, ScheduleController.deleteSchedule);

export default router;
