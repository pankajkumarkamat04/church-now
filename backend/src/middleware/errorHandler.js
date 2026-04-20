/**
 * Central error handler. Mount after all routes.
 * Maps common Mongoose / Mongo errors to HTTP responses.
 */
function errorHandler(err, _req, res, _next) {
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid identifier' });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  if (err.code === 11000) {
    const keys = err.keyPattern ? Object.keys(err.keyPattern) : [];
    const field = keys[0] || 'value';
    if (field === 'conferenceId') {
      return res.status(409).json({ message: 'Conference code is already in use' });
    }
    return res.status(409).json({ message: `${field} is already in use` });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

module.exports = { errorHandler };
