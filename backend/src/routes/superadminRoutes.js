const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');
const { asyncHandler } = require('../utils/asyncHandler');
const {
  listChurches,
  getChurch,
  createChurch,
  updateChurch,
  deleteChurch,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  listCouncils,
  listCouncilMembers,
  createCouncil,
  updateCouncil,
  deleteCouncil,
  createChurchAdmin,
  createSuperadminUser,
  createMemberUser,
} = require('../controllers/superadminController');
const frontendController = require('../controllers/frontendController');
const eventController = require('../controllers/eventController');
const mediaController = require('../controllers/mediaController');
const subscriptionController = require('../controllers/subscriptionController');
const churchChangeController = require('../controllers/churchChangeController');
const titheController = require('../controllers/titheController');
const donationController = require('../controllers/donationController');
const expenseController = require('../controllers/expenseController');
const financeController = require('../controllers/financeController');
const conferenceController = require('../controllers/conferenceController');
const mainChurchController = require('../controllers/mainChurchController');
const subChurchController = require('../controllers/subChurchController');
const pastorController = require('../controllers/pastorController');
const attendanceController = require('../controllers/attendanceController');

const router = express.Router();

router.use(authenticate, requireRoles('SUPERADMIN'));

router.get('/churches', asyncHandler(listChurches));
router.post('/churches', asyncHandler(createChurch));
router.get('/main-churches', asyncHandler(mainChurchController.listMainChurches));
router.post('/main-churches', asyncHandler(mainChurchController.createMainChurch));
router.get('/main-churches/:id', asyncHandler(mainChurchController.getMainChurch));
router.put('/main-churches/:id', asyncHandler(mainChurchController.updateMainChurch));
router.delete('/main-churches/:id', asyncHandler(mainChurchController.deleteMainChurch));
router.get('/sub-churches', asyncHandler(subChurchController.listSubChurches));
router.post('/sub-churches', asyncHandler(subChurchController.createSubChurch));
router.get('/sub-churches/:id', asyncHandler(subChurchController.getSubChurch));
router.put('/sub-churches/:id', asyncHandler(subChurchController.updateSubChurch));
router.delete('/sub-churches/:id', asyncHandler(subChurchController.deleteSubChurch));
router.get('/conferences', asyncHandler(conferenceController.listConferences));
router.get('/conferences/:conferenceId', asyncHandler(conferenceController.getConference));
router.post('/conferences', asyncHandler(conferenceController.createConference));
router.put('/conferences/:conferenceId', asyncHandler(conferenceController.updateConference));
router.delete('/conferences/:conferenceId', asyncHandler(conferenceController.removeConference));

router.get('/media', asyncHandler(mediaController.list));
router.post('/media/upload', mediaController.upload.single('file'), asyncHandler(mediaController.uploadOne));
router.delete('/media/:fileName', asyncHandler(mediaController.remove));
router.get('/subscriptions', asyncHandler(subscriptionController.listSuperadminSubscriptions));
router.get('/tithes', asyncHandler(titheController.listSuperadminTithes));
router.get('/donations', asyncHandler(donationController.listSuperadminDonations));
router.get('/finance/summary', asyncHandler(financeController.getSuperadminFinanceSummary));
router.get('/expenses', asyncHandler(expenseController.listSuperadminExpenses));
router.post('/expenses', asyncHandler(expenseController.createSuperadminExpense));
router.put('/expenses/:expenseId', asyncHandler(expenseController.updateSuperadminExpense));
router.delete('/expenses/:expenseId', asyncHandler(expenseController.removeSuperadminExpense));
router.post('/tithes', asyncHandler(titheController.createSuperadminTithe));
router.put('/tithes/:titheId', asyncHandler(titheController.updateSuperadminTithe));
router.delete('/tithes/:titheId', asyncHandler(titheController.removeSuperadminTithe));
router.get('/church-change-requests', asyncHandler(churchChangeController.listSuperadminChurchChangeRequests));
router.post(
  '/church-change-requests/:requestId/decision',
  asyncHandler(churchChangeController.decideChurchChangeRequest)
);
router.get('/churches/:churchId/events', asyncHandler(eventController.listSuperadmin));
router.get('/churches/:churchId/events/:eventId', asyncHandler(eventController.getSuperadmin));
router.post('/churches/:churchId/events', asyncHandler(eventController.createSuperadmin));
router.put('/churches/:churchId/events/:eventId', asyncHandler(eventController.updateSuperadmin));
router.delete('/churches/:churchId/events/:eventId', asyncHandler(eventController.removeSuperadmin));

router.post('/churches/:churchId/admins', asyncHandler(createChurchAdmin));

router.get('/churches/:id', asyncHandler(getChurch));
router.put('/churches/:id', asyncHandler(updateChurch));
router.delete('/churches/:id', asyncHandler(deleteChurch));

router.get('/users', asyncHandler(listUsers));
router.get('/councils', asyncHandler(listCouncils));
router.get('/councils/:councilId/members', asyncHandler(listCouncilMembers));
router.post('/councils', asyncHandler(createCouncil));
router.put('/councils/:councilId', asyncHandler(updateCouncil));
router.delete('/councils/:councilId', asyncHandler(deleteCouncil));
router.get('/pastor-members', asyncHandler(pastorController.listEligibleMembersForSuperadmin));
router.get('/attendance', asyncHandler(attendanceController.listMonthSuperadmin));
router.get('/attendance/:dateKey', asyncHandler(attendanceController.getDaySuperadmin));
router.put('/attendance/:dateKey', asyncHandler(attendanceController.saveDaySuperadmin));
router.get('/pastors', asyncHandler(pastorController.listPastorsForSuperadmin));
router.post('/pastors', asyncHandler(pastorController.createPastorForSuperadmin));
router.get('/pastor-terms', asyncHandler(pastorController.listSuperadminPastorTerms));
router.post('/pastor-terms/assign', asyncHandler(pastorController.assignPastorTerm));
router.post('/pastor-terms/:termId/renew', asyncHandler(pastorController.renewPastorTerm));
router.post('/pastor-terms/:termId/transfer', asyncHandler(pastorController.transferPastor));
router.post('/members', asyncHandler(createMemberUser));
router.get('/users/:id', asyncHandler(getUser));
router.put('/users/:id', asyncHandler(updateUser));
router.delete('/users/:id', asyncHandler(deleteUser));
router.post('/users/superadmin', asyncHandler(createSuperadminUser));

module.exports = router;
