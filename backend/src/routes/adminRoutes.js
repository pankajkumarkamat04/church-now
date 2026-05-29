const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');
const { asyncHandler } = require('../utils/asyncHandler');
const frontendController = require('../controllers/frontendController');
const eventController = require('../controllers/eventController');
const paymentController = require('../controllers/paymentController');
const paymentTypeController = require('../controllers/paymentTypeController');
const expenseController = require('../controllers/expenseController');
const procurementController = require('../controllers/procurementController');
const financeController = require('../controllers/financeController');
const assetController = require('../controllers/assetController');
const pastorController = require('../controllers/pastorController');
const attendanceController = require('../controllers/attendanceController');
const mediaController = require('../controllers/mediaController');
const announcementController = require('../controllers/announcementController');
const churchLogoController = require('../controllers/churchLogoController');
const passwordAdminController = require('../controllers/passwordAdminController');
const remittanceController = require('../controllers/remittanceController');
const transactionDeletionController = require('../controllers/transactionDeletionController');
const ledgerController = require('../controllers/ledgerController');
const budgetController = require('../controllers/budgetController');
const globalPaymentController = require('../controllers/globalPaymentController');

const router = express.Router();

router.use(authenticate, requireRoles('ADMIN'));

router.get('/church', asyncHandler(frontendController.getMyChurch));
router.put('/church', asyncHandler(frontendController.updateMyChurch));
router.post(
  '/church/logo',
  mediaController.upload.single('file'),
  asyncHandler((req, res, next) => {
    const id = req.user?.church ? String(req.user.church) : '';
    if (!id) return res.status(400).json({ message: 'No church assigned' });
    req.params.churchId = id;
    return churchLogoController.uploadChurchLogo(req, res, next);
  })
);
router.get('/members', asyncHandler(frontendController.listMembers));
router.get('/pending-approvals', asyncHandler(frontendController.listPendingApprovals));
router.patch('/members/:memberId/reject', asyncHandler(frontendController.rejectMember));
router.get('/councils', asyncHandler(frontendController.listGlobalCouncils));
router.get('/councils/:councilId/members', asyncHandler(frontendController.listAdminCouncilMembers));
router.post('/members', asyncHandler(frontendController.createMember));
router.get('/members/:memberId/statement', asyncHandler(paymentController.listMemberStatementForAdmin));
router.get('/members/:memberId', asyncHandler(frontendController.getMember));
router.put('/members/:memberId', asyncHandler(frontendController.updateMember));
router.post(
  '/members/:memberId/reset-password',
  asyncHandler(passwordAdminController.adminResetMemberPassword)
);
router.patch('/members/:memberId/deactivate', asyncHandler(frontendController.deactivateMember));
router.patch('/members/:memberId/approve', asyncHandler(frontendController.approveMember));
router.get('/pastor-members', asyncHandler(pastorController.listEligibleMembers));
router.get('/pastors', asyncHandler(pastorController.listPastors));
router.get('/pastors/:recordId', asyncHandler(pastorController.getPastor));
router.get('/pastor-terms', asyncHandler(pastorController.listAdminPastorTerms));
router.post('/pastor-terms/assign', asyncHandler(pastorController.assignPastorTerm));
router.post('/pastor-terms/:termId/renew', asyncHandler(pastorController.renewPastorTerm));
router.delete('/pastor-terms/:termId', asyncHandler(pastorController.removeSpiritualLeader));
router.get('/attendance', asyncHandler(attendanceController.listMonth));
router.get('/attendance/:dateKey', asyncHandler(attendanceController.getDay));
router.put('/attendance/:dateKey', asyncHandler(attendanceController.saveDay));

router.get('/media', asyncHandler(mediaController.listAdmin));
router.post('/media/upload', mediaController.upload.single('file'), asyncHandler(mediaController.uploadAdmin));
router.post(
  '/media/flyer-upload',
  mediaController.flyerUpload.single('file'),
  asyncHandler(mediaController.uploadFlyerAdmin)
);
router.post(
  '/media/announcement-upload',
  mediaController.announcementUpload.single('file'),
  asyncHandler(mediaController.uploadAnnouncementAdmin)
);
router.delete('/media/:fileName', asyncHandler(mediaController.removeAdmin));

router.get('/events', asyncHandler(eventController.listAdmin));
router.post('/events', asyncHandler(eventController.create));
router.put('/events/:id', asyncHandler(eventController.update));
router.delete('/events/:id', asyncHandler(eventController.remove));

router.get('/announcements', asyncHandler(announcementController.listAdminAnnouncements));
router.post('/announcements', asyncHandler(announcementController.createAdminAnnouncement));
router.get('/payment-types', asyncHandler(paymentTypeController.listAdminPaymentTypes));
router.post('/payment-types', asyncHandler(paymentTypeController.createAdminPaymentType));
router.patch('/payment-types/:typeId', asyncHandler(paymentTypeController.updateAdminPaymentType));
router.delete('/payment-types/:typeId', asyncHandler(paymentTypeController.removeAdminPaymentType));
router.get('/payments', asyncHandler(paymentController.listAdminPayments));
router.get('/payments/member-balances', asyncHandler(paymentController.listAdminMemberBalances));
router.get('/payments/deposits', asyncHandler(paymentController.listAdminDepositHistory));
router.post('/payments/deposit', asyncHandler(paymentController.depositMemberBalance));
router.post('/payments/pay-on-behalf', asyncHandler(paymentController.payOnBehalf));
router.get('/finance/summary', asyncHandler(financeController.getAdminFinanceSummary));
router.get('/assets', asyncHandler(assetController.listAdminAssets));
router.post('/assets', asyncHandler(assetController.createAdminAsset));
router.put('/assets/:assetId', asyncHandler(assetController.updateAdminAsset));
router.delete('/assets/:assetId', asyncHandler(assetController.removeAdminAsset));
router.get('/expenses', asyncHandler(expenseController.listAdminExpenses));
router.post('/expenses', asyncHandler(expenseController.createAdminExpense));
router.put('/expenses/:expenseId', asyncHandler(expenseController.updateAdminExpense));
router.post('/expenses/:expenseId/verify', asyncHandler(expenseController.verifyAdminExpense));
router.post('/expenses/:expenseId/notice-approval', asyncHandler(expenseController.approveAdminExpenseNotice));
router.delete('/expenses/:expenseId', asyncHandler(expenseController.removeAdminExpense));
router.get('/procurements', asyncHandler(procurementController.listAdminProcurements));
router.post('/procurements', asyncHandler(procurementController.createAdminProcurement));
router.get('/procurements/:procurementId', asyncHandler(procurementController.getAdminProcurement));
router.put('/procurements/:procurementId', asyncHandler(procurementController.updateAdminProcurement));
router.post('/procurements/:procurementId/submit', asyncHandler(procurementController.submitAdminProcurement));
router.post('/procurements/:procurementId/approve', asyncHandler(procurementController.approveAdminProcurement));
router.post('/procurements/:procurementId/reject', asyncHandler(procurementController.rejectAdminProcurement));
router.get('/finance/remittances/church', asyncHandler(remittanceController.listAdminChurchRemittances));
router.get('/finance/remittances/church/details', asyncHandler(remittanceController.getAdminChurchRemittanceDetails));
router.get('/finance/remittances/audit', asyncHandler(remittanceController.listAdminChurchRemittanceAudit));
router.post('/finance/remittances/church', asyncHandler(remittanceController.recordAdminChurchRemittance));
router.patch('/finance/remittances/church/entries/:entryId', asyncHandler(remittanceController.updateAdminChurchRemittanceEntry));
router.delete('/finance/remittances/church/entries/:entryId', asyncHandler(remittanceController.deleteAdminChurchRemittanceEntry));
router.get('/transaction-deletions', asyncHandler(transactionDeletionController.listAdminTransactionDeletions));
router.post('/transaction-deletions', asyncHandler(transactionDeletionController.requestAdminTransactionDeletion));
router.post(
  '/transaction-deletions/:requestId/approve',
  asyncHandler(transactionDeletionController.approveAdminTransactionDeletion)
);
router.delete(
  '/transaction-deletions/:requestId',
  asyncHandler(transactionDeletionController.cancelAdminTransactionDeletion)
);

router.get('/accounting/ledger', asyncHandler(ledgerController.getLedgerAccounts));
router.post('/accounting/ledger', asyncHandler(ledgerController.createLedgerAccount));
router.get('/accounting/ledger/entries', asyncHandler(ledgerController.getJournalEntries));
router.get('/accounting/ledger/cashbook-summary', asyncHandler(ledgerController.getCashBookSummary));
router.get('/accounting/ledger/:accountId', asyncHandler(ledgerController.getLedgerAccountById));
router.put('/accounting/ledger/:accountId', asyncHandler(ledgerController.updateLedgerAccount));
router.get('/accounting/ledger/:accountId/transactions', asyncHandler(ledgerController.getAccountTransactions));
router.put('/accounting/ledger/entries/:entryId/verify', asyncHandler(ledgerController.verifyTransaction));
router.put('/accounting/ledger/entries/:entryId/reject', asyncHandler(ledgerController.rejectTransaction));

router.get('/accounting/budget', asyncHandler(budgetController.getBudgets));
router.get('/accounting/budget/summary', asyncHandler(budgetController.getBudgetSummary));
router.get('/accounting/budget/vs-actual', asyncHandler(budgetController.getBudgetVsActualReport));
router.post('/accounting/budget', asyncHandler(budgetController.createBudget));
router.get('/accounting/budget/:budgetId', asyncHandler(budgetController.getBudgetById));
router.put('/accounting/budget/:budgetId', asyncHandler(budgetController.updateBudget));
router.put('/accounting/budget/:budgetId/approve', asyncHandler(budgetController.approveBudget));
router.put('/accounting/budget/:budgetId/activate', asyncHandler(budgetController.activateBudget));
router.post('/accounting/budget/:budgetId/refresh-actuals', asyncHandler(budgetController.refreshBudgetActuals));

router.get('/accounting/global-payments/members', asyncHandler(globalPaymentController.listMembers));
router.get('/accounting/global-payments/members/:memberId', asyncHandler(globalPaymentController.getMemberFinancialSummary));
router.post('/accounting/global-payments/members/:memberId/deposit', asyncHandler(globalPaymentController.recordGlobalDeposit));
router.post('/accounting/global-payments/members/:memberId/pay', asyncHandler(globalPaymentController.recordGlobalPayment));

module.exports = router;
