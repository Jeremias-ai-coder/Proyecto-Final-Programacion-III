import { Router } from 'express';
import { authController } from '../container';
import { authGuard } from '../middlewares/authGuard';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', authGuard, authController.getMe);
router.patch('/profile', authGuard, authController.updateProfile);

export default router;
