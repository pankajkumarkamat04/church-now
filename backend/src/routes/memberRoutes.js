const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');
const { asyncHandler } = require('../utils/asyncHandler');
const {
  getProfile,
  updateProfile,
  getMyChurchInfo,
  listMyConferences,
  joinConference,
  getConferenceDetails,
} = require('../controllers/memberController');
const subscriptionController = require('../controllers/subscriptionController');
const churchChangeController = require('../controllers/churchChangeController');
const titheController = require('../controllers/titheController');
const conferenceForumController = require('../controllers/conferenceForumController');

const router = express.Router();

router.use(authenticate, requireRoles('MEMBER'));

router.get('/profile', asyncHandler(getProfile));
router.put('/profile', asyncHandler(updateProfile));
router.get('/church', asyncHandler(getMyChurchInfo));
router.get('/conferences', asyncHandler(listMyConferences));
router.get('/conferences/:conferenceId', asyncHandler(getConferenceDetails));
router.post('/conferences/:conferenceId/join', asyncHandler(joinConference));
router.get('/conferences/:conferenceId/forum/posts', asyncHandler(conferenceForumController.listMemberConferencePosts));
router.post('/conferences/:conferenceId/forum/posts', asyncHandler(conferenceForumController.createMemberConferencePost));
router.get('/subscriptions/plans', asyncHandler(subscriptionController.listMemberPlans));
router.get('/subscriptions/me', asyncHandler(subscriptionController.getMySubscription));
router.post('/subscriptions/subscribe', asyncHandler(subscriptionController.subscribeMember));
router.post('/subscriptions/cancel', asyncHandler(subscriptionController.cancelMySubscription));
router.get('/tithes', asyncHandler(titheController.listMemberTithes));
router.post('/tithes/pay', asyncHandler(titheController.payMemberTithe));
router.get('/church-change-requests', asyncHandler(churchChangeController.listMyChurchChangeRequests));
router.post('/church-change-requests', asyncHandler(churchChangeController.createChurchChangeRequest));

module.exports = router;
