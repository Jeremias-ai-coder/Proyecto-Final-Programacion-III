import { prisma } from './config/prisma';

// Repositorios
import { PrismaServiceRepository } from './repositories/prisma-service.repository';
import { PrismaBusinessRepository } from './repositories/prisma-business.repository';
import { PrismaAppointmentRepository } from './repositories/prisma-appointment.repository';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { PrismaScheduleRepository } from './repositories/prisma-schedule.repository';
import { PrismaReviewRepository } from './repositories/prisma-review.repository';

// Servicios
import { ServiceService } from './services/service.service';
import { BusinessService } from './services/business.service';
import { AppointmentService } from './services/appointment.service';
import { AuthService } from './services/auth.service';
import { ScheduleService } from './services/schedule.service';
import { AdminService } from './services/admin.service';
import { ReviewService } from './services/review.service';

// Controladores
import { ServiceController } from './controllers/service.controller';
import { BusinessController } from './controllers/business.controller';
import { AppointmentController } from './controllers/appointment.controller';
import { AuthController } from './controllers/auth.controller';
import { ScheduleController } from './controllers/schedule.controller';
import { AdminController } from './controllers/admin.controller';
import { ReviewController } from './controllers/review.controller';

// 1. Instanciación de Repositorios (Inyección de Prisma Client)
export const serviceRepository = new PrismaServiceRepository(prisma);
export const businessRepository = new PrismaBusinessRepository(prisma);
export const appointmentRepository = new PrismaAppointmentRepository(prisma);
export const userRepository = new PrismaUserRepository(prisma);
export const scheduleRepository = new PrismaScheduleRepository(prisma);
export const reviewRepository = new PrismaReviewRepository(prisma);

// 2. Instanciación de Servicios (Inyección de Repositorios)
export const serviceService = new ServiceService(serviceRepository, businessRepository);
export const businessService = new BusinessService(businessRepository, userRepository);
export const appointmentService = new AppointmentService(appointmentRepository, serviceRepository);
export const authService = new AuthService(userRepository);
export const scheduleService = new ScheduleService(scheduleRepository, businessRepository);
export const adminService = new AdminService(userRepository, businessRepository, appointmentRepository);
export const reviewService = new ReviewService(reviewRepository, appointmentRepository);

// 3. Instanciación de Controladores (Inyección de Servicios)
export const serviceController = new ServiceController(serviceService);
export const businessController = new BusinessController(businessService);
export const appointmentController = new AppointmentController(appointmentService);
export const authController = new AuthController(authService);
export const scheduleController = new ScheduleController(scheduleService);
export const adminController = new AdminController(adminService);
export const reviewController = new ReviewController(reviewService);
