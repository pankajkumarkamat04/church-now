const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const frontendController = require('../controllers/frontendController');
const eventController = require('../controllers/eventController');
const galleryController = require('../controllers/galleryController');
const conferenceController = require('../controllers/conferenceController');

const router = express.Router();

router.get('/site', asyncHandler(frontendController.getPublicGlobalSite));
router.get('/churches', asyncHandler(frontendController.listPublicChurches));
router.get('/conferences', asyncHandler(conferenceController.listPublicConferences));
router.get('/events', asyncHandler(eventController.listPublicGlobal));
router.get('/gallery', asyncHandler(galleryController.listPublicGlobal));

module.exports = router;
