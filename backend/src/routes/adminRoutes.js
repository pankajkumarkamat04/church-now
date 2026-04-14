const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');
const { asyncHandler } = require('../utils/asyncHandler');
const frontendController = require('../controllers/frontendController');
const eventController = require('../controllers/eventController');
const galleryController = require('../controllers/galleryController');
const subscriptionController = require('../controllers/subscriptionController');
const titheController = require('../controllers/titheController');

const router = express.Router();

router.use(authenticate, requireRoles('ADMIN'));

router.get('/church', asyncHandler(frontendController.getMyChurch));
router.put('/church', asyncHandler(frontendController.updateMyChurch));
router.get('/members', asyncHandler(frontendController.listMembers));
router.post('/members', asyncHandler(frontendController.createMember));
router.get('/members/:memberId', asyncHandler(frontendController.getMember));
router.put('/members/:memberId', asyncHandler(frontendController.updateMember));
router.patch('/members/:memberId/deactivate', asyncHandler(frontendController.deactivateMember));

router.get('/frontend/site', asyncHandler(frontendController.getAdminSite));
router.put('/frontend/site', asyncHandler(frontendController.putAdminSite));

router.get('/events', asyncHandler(eventController.listAdmin));
router.post('/events', asyncHandler(eventController.create));
router.put('/events/:id', asyncHandler(eventController.update));
router.delete('/events/:id', asyncHandler(eventController.remove));

router.get('/gallery', asyncHandler(galleryController.listAdmin));
router.post('/gallery', asyncHandler(galleryController.create));
router.put('/gallery/:id', asyncHandler(galleryController.update));
router.delete('/gallery/:id', asyncHandler(galleryController.remove));

router.get('/subscriptions/plans', asyncHandler(subscriptionController.listAdminPlans));
router.post('/subscriptions/plans', asyncHandler(subscriptionController.createAdminPlan));
router.put('/subscriptions/plans/:planId', asyncHandler(subscriptionController.updateAdminPlan));
router.delete('/subscriptions/plans/:planId', asyncHandler(subscriptionController.removeAdminPlan));
router.get('/subscriptions', asyncHandler(subscriptionController.listChurchSubscriptions));
router.get('/tithes', asyncHandler(titheController.listAdminTithes));
router.post('/tithes', asyncHandler(titheController.createAdminTithe));
router.put('/tithes/:titheId', asyncHandler(titheController.updateAdminTithe));
router.delete('/tithes/:titheId', asyncHandler(titheController.removeAdminTithe));

module.exports = router;
