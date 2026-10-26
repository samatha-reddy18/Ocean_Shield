/**
 * 404 handler for unmatched routes.
 */
export function notFound(req, res, _next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

/**
 * Central error handler. Converts known error types into clean JSON.
 */
export function errorHandler(err, req, res, _next) {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Internal server error';

  // Mongoose: bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Mongoose: duplicate key (e.g. unique email)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}`;
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
  }

  // Multer file size
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = `File too large. Max ${process.env.MAX_IMAGE_UPLOAD_MB || 10} MB per image.`;
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files. Max 5 images per report.';
    } else {
      message = err.message;
    }
  }

  if (statusCode >= 500) {
    console.error('Unhandled error:', err);
  }

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && err.stack ? { stack: err.stack } : {}),
  });
}

export default errorHandler;
