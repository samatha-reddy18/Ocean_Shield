import { Router } from 'express';
import { getMapReports, getHotspots } from '../controllers/mapController.js';

const router = Router();

// Map endpoints are public (no auth) — they expose only summary map data.
router.get('/reports', getMapReports);
router.get('/hotspots', getHotspots);

export default router;
