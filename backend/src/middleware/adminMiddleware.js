/**
 * Restricts access to administrator users only.
 * Must be used after authMiddleware.protect.
 */
export function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator access required' });
  }
  next();
}

/**
 * Restricts access to administrators or researchers.
 */
export function researcherOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'researcher') {
    return res.status(403).json({ message: 'Researcher or administrator access required' });
  }
  next();
}

export default adminOnly;
