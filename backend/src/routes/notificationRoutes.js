import { Router } from 'express';
import {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getNotifications);
router.patch('/mark-all-read', markAllRead);
router.patch('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
