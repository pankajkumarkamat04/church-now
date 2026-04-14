const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const {
  register,
  login,
  me,
  requestPasswordReset,
  resetPassword,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/forgot-password', asyncHandler(requestPasswordReset));
router.post('/reset-password', asyncHandler(resetPassword));
router.get('/me', authenticate, asyncHandler(me));

module.exports = router;
