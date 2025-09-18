function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) return res.status(401).json({ message: 'Unauthorized' });
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) return res.status(401).json({ message: 'Unauthorized' });
    if (req.session.user.role !== role) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

module.exports = { requireAuth, requireRole };


