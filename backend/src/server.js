import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`OceanShield backend running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

start();
