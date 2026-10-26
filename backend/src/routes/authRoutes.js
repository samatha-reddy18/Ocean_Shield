import { Router } from 'express';
import { register, login, getMe, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Stricter rate limit for auth endpoints to mitigate brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts, please try again later.' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.patch('/me', protect, updateProfile);

export default router;
