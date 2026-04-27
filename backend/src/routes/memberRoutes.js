const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireMemberPortal } = require('../middleware/roles');
const { asyncHandler } = require('../utils/asyncHandler');
const { getProfile, updateProfile, getMyChurchInfo, getMyCouncils } = require('../controllers/memberController');
const churchChangeController = require('../controllers/churchChangeController');
const paymentController = require('../controllers/paymentController');
const announcementController = require('../controllers/announcementController');

const router = express.Router();

router.use(authenticate, requireMemberPortal());

router.get('/profile', asyncHandler(getProfile));
router.put('/profile', asyncHandler(updateProfile));
router.get('/church', asyncHandler(getMyChurchInfo));
router.get('/councils', asyncHandler(getMyCouncils));
router.get('/payments', asyncHandler(paymentController.listMemberPayments));
router.post('/payments/pay', asyncHandler(paymentController.payMember));
router.get('/announcements', asyncHandler(announcementController.listMyAnnouncements));
router.get('/church-change-requests', asyncHandler(churchChangeController.listMyChurchChangeRequests));
router.post('/church-change-requests', asyncHandler(churchChangeController.createChurchChangeRequest));

module.exports = router;
