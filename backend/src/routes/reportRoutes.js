import { Router } from 'express';
import {
  createReport,
  getReports,
  getMyReports,
  getReportById,
  updateReport,
  deleteReport,
} from '../controllers/reportController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

// Public read endpoints (personalized when a token is present)
router.get('/', optionalAuth, getReports);
router.get('/my', protect, getMyReports);
router.get('/:id', optionalAuth, getReportById);

// Authenticated write endpoints
router.post('/', protect, upload.array('images', 5), createReport);
router.patch('/:id', protect, updateReport);
router.delete('/:id', protect, deleteReport);

export default router;
