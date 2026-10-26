import { Router } from 'express';
import {
  getAiHealth,
  analyzeReportImage,
  analyzeTextHandler,
  checkDuplicatesHandler,
} from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/health', getAiHealth);
router.post('/analyze-image', protect, analyzeReportImage);
router.post('/analyze-text', protect, analyzeTextHandler);
router.post('/check-duplicates', protect, checkDuplicatesHandler);

export default router;
