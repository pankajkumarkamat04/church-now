/**
 * Central error handler. Mount after all routes.
 * Maps common Mongoose / Mongo errors to HTTP responses.
 */
function errorHandler(err, _req, res, _next) {
  if (err && (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE')) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large'
        : err.message || 'Upload failed';
    return res.status(400).json({ message });
  }

  if (err && typeof err.message === 'string' && /only .* allowed/i.test(err.message)) {
    return res.status(400).json({ message: err.message });
  }

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
    if (keys.includes('memberId') && keys.includes('church')) {
      return res.status(409).json({ message: 'This member ID is already in use at this church' });
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
