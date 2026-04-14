/**
 * Wraps async route handlers so rejected promises reach Express error middleware.
 * Usage: router.get('/x', asyncHandler(controller.method))
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
