import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import mapRoutes from './routes/mapRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import satelliteRoutes from './routes/satelliteRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import sseRoutes from './routes/sseRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust first proxy when behind one (for rate limiting / req.ip)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS for the Vite dev server
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Compression + logging
app.use(compression());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', apiLimiter);

// Serve uploaded images when using local storage fallback
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'oceanshield-backend', time: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/satellite', satelliteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/events', sseRoutes);

// 404 + error handling
app.use(notFound);
app.use(errorHandler);

export default app;
