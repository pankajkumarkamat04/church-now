const SUPERADMIN_PANEL_ROLES = ['SUPERADMIN', 'CHURCH_ADMIN'];

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

/** Denomination control panel (superadmin + Church Admin pastor). */
function requireSuperadminPanel() {
  return requireRoles(...SUPERADMIN_PANEL_ROLES);
}

/** System superadmin only (e.g. create superadmin accounts). */
function requireSuperadminOnly() {
  return requireRoles('SUPERADMIN');
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

module.exports = {
  requireRoles,
  requireMemberPortal,
  requireSuperadminPanel,
  requireSuperadminOnly,
  SUPERADMIN_PANEL_ROLES,
};
