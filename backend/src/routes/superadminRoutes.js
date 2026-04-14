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
  createChurchAdmin,
  createSuperadminUser,
} = require('../controllers/superadminController');
const frontendController = require('../controllers/frontendController');
const eventController = require('../controllers/eventController');
const galleryController = require('../controllers/galleryController');

const router = express.Router();

router.use(authenticate, requireRoles('SUPERADMIN'));

router.get('/churches', asyncHandler(listChurches));
router.post('/churches', asyncHandler(createChurch));

router.get('/frontend/site', asyncHandler(frontendController.getGlobalSite));
router.put('/frontend/site', asyncHandler(frontendController.putGlobalSite));
router.get('/churches/:churchId/events', asyncHandler(eventController.listSuperadmin));
router.get('/churches/:churchId/events/:eventId', asyncHandler(eventController.getSuperadmin));
router.post('/churches/:churchId/events', asyncHandler(eventController.createSuperadmin));
router.put('/churches/:churchId/events/:eventId', asyncHandler(eventController.updateSuperadmin));
router.delete('/churches/:churchId/events/:eventId', asyncHandler(eventController.removeSuperadmin));
router.get('/churches/:churchId/gallery', asyncHandler(galleryController.listSuperadmin));
router.get('/churches/:churchId/gallery/:itemId', asyncHandler(galleryController.getSuperadmin));
router.post('/churches/:churchId/gallery', asyncHandler(galleryController.createSuperadmin));
router.put('/churches/:churchId/gallery/:itemId', asyncHandler(galleryController.updateSuperadmin));
router.delete('/churches/:churchId/gallery/:itemId', asyncHandler(galleryController.removeSuperadmin));

router.post('/churches/:churchId/admins', asyncHandler(createChurchAdmin));

router.get('/churches/:id', asyncHandler(getChurch));
router.put('/churches/:id', asyncHandler(updateChurch));
router.delete('/churches/:id', asyncHandler(deleteChurch));

router.get('/users', asyncHandler(listUsers));
router.get('/users/:id', asyncHandler(getUser));
router.put('/users/:id', asyncHandler(updateUser));
router.delete('/users/:id', asyncHandler(deleteUser));
router.post('/users/superadmin', asyncHandler(createSuperadminUser));

module.exports = router;
