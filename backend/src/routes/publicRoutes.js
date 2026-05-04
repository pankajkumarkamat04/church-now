const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const frontendController = require('../controllers/frontendController');
const eventController = require('../controllers/eventController');
const conferenceController = require('../controllers/conferenceController');
const currencyController = require('../controllers/currencyController');
const systemSettingController = require('../controllers/systemSettingController');

const router = express.Router();

router.get('/currency/rates', asyncHandler(currencyController.getPublicRates));
router.get('/system-settings', asyncHandler(systemSettingController.getPublicSystemSettings));
router.get('/churches', asyncHandler(frontendController.listPublicChurches));
router.get('/conferences', asyncHandler(conferenceController.listPublicConferences));
router.get('/councils', asyncHandler(frontendController.listPublicCouncils));
router.get('/events', asyncHandler(eventController.listPublicGlobal));

module.exports = router;
