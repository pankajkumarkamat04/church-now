const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');
const { asyncHandler } = require('../utils/asyncHandler');
const frontendController = require('../controllers/frontendController');
const eventController = require('../controllers/eventController');
const subscriptionController = require('../controllers/subscriptionController');
const titheController = require('../controllers/titheController');
const donationController = require('../controllers/donationController');
const expenseController = require('../controllers/expenseController');
const financeController = require('../controllers/financeController');
const pastorController = require('../controllers/pastorController');
const attendanceController = require('../controllers/attendanceController');
const mediaController = require('../controllers/mediaController');

const router = express.Router();

router.use(authenticate, requireRoles('ADMIN'));

router.get('/church', asyncHandler(frontendController.getMyChurch));
router.put('/church', asyncHandler(frontendController.updateMyChurch));
router.get('/members', asyncHandler(frontendController.listMembers));
router.get('/councils', asyncHandler(frontendController.listGlobalCouncils));
router.get('/councils/:councilId/members', asyncHandler(frontendController.listAdminCouncilMembers));
router.post('/members', asyncHandler(frontendController.createMember));
router.get('/members/:memberId', asyncHandler(frontendController.getMember));
router.put('/members/:memberId', asyncHandler(frontendController.updateMember));
router.patch('/members/:memberId/deactivate', asyncHandler(frontendController.deactivateMember));
router.patch('/members/:memberId/approve', asyncHandler(frontendController.approveMember));
router.get('/pastor-members', asyncHandler(pastorController.listEligibleMembers));
router.get('/pastors', asyncHandler(pastorController.listPastors));
router.post('/pastors', asyncHandler(pastorController.createPastor));
router.get('/pastor-terms', asyncHandler(pastorController.listAdminPastorTerms));
router.post('/pastor-terms/assign', asyncHandler(pastorController.assignPastorTerm));
router.post('/pastor-terms/:termId/renew', asyncHandler(pastorController.renewPastorTerm));
router.get('/attendance', asyncHandler(attendanceController.listMonth));
router.get('/attendance/:dateKey', asyncHandler(attendanceController.getDay));
router.put('/attendance/:dateKey', asyncHandler(attendanceController.saveDay));

router.get('/media', asyncHandler(mediaController.listAdmin));
router.post('/media/upload', mediaController.upload.single('file'), asyncHandler(mediaController.uploadAdmin));
router.delete('/media/:fileName', asyncHandler(mediaController.removeAdmin));

router.get('/events', asyncHandler(eventController.listAdmin));
router.post('/events', asyncHandler(eventController.create));
router.put('/events/:id', asyncHandler(eventController.update));
router.delete('/events/:id', asyncHandler(eventController.remove));

router.get('/subscriptions', asyncHandler(subscriptionController.listChurchSubscriptions));
router.get('/tithes', asyncHandler(titheController.listAdminTithes));
router.get('/donations', asyncHandler(donationController.listAdminDonations));
router.get('/finance/summary', asyncHandler(financeController.getAdminFinanceSummary));
router.get('/expenses', asyncHandler(expenseController.listAdminExpenses));
router.post('/expenses', asyncHandler(expenseController.createAdminExpense));
router.put('/expenses/:expenseId', asyncHandler(expenseController.updateAdminExpense));
router.delete('/expenses/:expenseId', asyncHandler(expenseController.removeAdminExpense));
router.post('/tithes', asyncHandler(titheController.createAdminTithe));
router.put('/tithes/:titheId', asyncHandler(titheController.updateAdminTithe));
router.delete('/tithes/:titheId', asyncHandler(titheController.removeAdminTithe));

module.exports = router;
