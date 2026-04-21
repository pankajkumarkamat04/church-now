function requireRoles(...allowed) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Church members, plus church admins promoted from members (role ADMIN, home church + member id).
 */
function requireMemberPortal() {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (req.user.role === 'MEMBER') {
      return next();
    }
    if (
      req.user.role === 'ADMIN' &&
      req.user.church &&
      String(req.user.memberId || '').trim() !== ''
    ) {
      return next();
    }
    return res.status(403).json({ message: 'Insufficient permissions' });
  };
}

module.exports = { requireRoles, requireMemberPortal };
