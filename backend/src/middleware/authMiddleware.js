import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protects routes by verifying a Bearer JWT.
 * Attaches the authenticated user (without password) to req.user.
 */
export async function protect(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // SSE connections use EventSource which cannot send custom headers in all
  // browsers, so we also accept the token as a ?token= query parameter.
  // This is only used for the /api/events SSE endpoint.
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired, please log in again' });
    }
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
}

/**
 * Optional auth: attaches user if a valid token is present, but does not
 * require one. Useful for public endpoints that personalize when logged in.
 */
export async function optionalAuth(req, res, next) {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user) req.user = user;
  } catch (_err) {
    // ignore invalid token for optional auth
  }
  next();
}

export default protect;
