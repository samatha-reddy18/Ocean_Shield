import { Router } from 'express';
import {
  getDashboardStats,
  getReportsForReview,
  updateReportStatus,
  getReviewLogs,
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';

const router = Router();

// All admin routes require authentication AND admin role
router.use(protect);
router.use(adminOnly);

router.get('/dashboard', getDashboardStats);
router.get('/reports', getReportsForReview);
router.patch('/reports/:id/status', updateReportStatus);
router.get('/review-logs', getReviewLogs);

export default router;
