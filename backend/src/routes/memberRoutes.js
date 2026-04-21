const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireMemberPortal } = require('../middleware/roles');
const { asyncHandler } = require('../utils/asyncHandler');
const { getProfile, updateProfile, getMyChurchInfo, getMyCouncils } = require('../controllers/memberController');
const subscriptionController = require('../controllers/subscriptionController');
const churchChangeController = require('../controllers/churchChangeController');
const titheController = require('../controllers/titheController');

const router = express.Router();

router.use(authenticate, requireMemberPortal());

router.get('/profile', asyncHandler(getProfile));
router.put('/profile', asyncHandler(updateProfile));
router.get('/church', asyncHandler(getMyChurchInfo));
router.get('/councils', asyncHandler(getMyCouncils));
router.get('/subscriptions/plans', asyncHandler(subscriptionController.listMemberPlans));
router.get('/subscriptions/me', asyncHandler(subscriptionController.getMySubscription));
router.post('/subscriptions/subscribe', asyncHandler(subscriptionController.subscribeMember));
router.post('/subscriptions/cancel', asyncHandler(subscriptionController.cancelMySubscription));
router.get('/tithes', asyncHandler(titheController.listMemberTithes));
router.post('/tithes/pay', asyncHandler(titheController.payMemberTithe));
router.get('/church-change-requests', asyncHandler(churchChangeController.listMyChurchChangeRequests));
router.post('/church-change-requests', asyncHandler(churchChangeController.createChurchChangeRequest));

module.exports = router;
