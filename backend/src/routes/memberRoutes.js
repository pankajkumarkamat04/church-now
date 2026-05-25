const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireMemberPortal } = require('../middleware/roles');
const { asyncHandler } = require('../utils/asyncHandler');
const {
  getProfile,
  updateProfile,
  changePassword,
  getMyChurchInfo,
  getMyCouncils,
} = require('../controllers/memberController');
const churchChangeController = require('../controllers/churchChangeController');
const paymentController = require('../controllers/paymentController');
const paymentTypeController = require('../controllers/paymentTypeController');
const announcementController = require('../controllers/announcementController');
const denominationAdminController = require('../controllers/denominationAdminController');

const router = express.Router();

router.use(authenticate, requireMemberPortal());

router.get('/profile', asyncHandler(getProfile));
router.put('/profile', asyncHandler(updateProfile));
router.post('/change-password', asyncHandler(changePassword));
router.get('/church', asyncHandler(getMyChurchInfo));
router.get('/councils', asyncHandler(getMyCouncils));
router.get('/payment-types', asyncHandler(paymentTypeController.listMemberPaymentTypes));
router.get('/payments', asyncHandler(paymentController.listMemberPayments));
router.get('/payments/balance', asyncHandler(paymentController.getMemberPaymentBalance));
router.post('/payments/pay', asyncHandler(paymentController.payMember));
router.get('/announcements', asyncHandler(announcementController.listMyAnnouncements));
router.get('/church-change-requests', asyncHandler(churchChangeController.listMyChurchChangeRequests));
router.post('/church-change-requests', asyncHandler(churchChangeController.createChurchChangeRequest));

router.get('/denomination-admin', asyncHandler(denominationAdminController.getDenominationAdminStatus));
router.post('/denomination-admin/appoint', asyncHandler(denominationAdminController.appointDenominationAdmin));
router.delete('/denomination-admin', asyncHandler(denominationAdminController.revokeDenominationAdmin));

module.exports = router;
