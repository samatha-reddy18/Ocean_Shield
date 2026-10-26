import { Router } from 'express';
import {
  getLayers,
  getTiles,
  getSatelliteSnapshot,
} from '../controllers/satelliteController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Layer catalog is available to authenticated users (citizen, researcher, admin).
router.get('/layers', protect, getLayers);
router.get('/tiles', protect, getTiles);
router.get('/snapshot', protect, getSatelliteSnapshot);

export default router;
