import { Router } from 'express';
import { sseStream } from '../controllers/sseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Authenticated SSE stream. The browser opens this once after login and keeps
// it open. EventSource sends the Authorization header as a query param because
// the EventSource API does not support custom headers in all browsers — we
// handle that by accepting the token as a ?token= query param here.
router.get('/', protect, sseStream);

export default router;
