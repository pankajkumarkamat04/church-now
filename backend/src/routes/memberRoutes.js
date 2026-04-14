const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');
const { asyncHandler } = require('../utils/asyncHandler');
const { getProfile, updateProfile, getMyChurchInfo } = require('../controllers/memberController');

const router = express.Router();

router.use(authenticate, requireRoles('MEMBER'));

router.get('/profile', asyncHandler(getProfile));
router.put('/profile', asyncHandler(updateProfile));
router.get('/church', asyncHandler(getMyChurchInfo));

module.exports = router;
