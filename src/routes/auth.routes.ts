import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authGuard } from '../middlewares/authGuard';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.get('/me', authGuard, AuthController.getMe);
router.patch('/profile', authGuard, AuthController.updateProfile);

export default router;
