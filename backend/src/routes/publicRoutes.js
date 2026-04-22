const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const frontendController = require('../controllers/frontendController');
const eventController = require('../controllers/eventController');
const conferenceController = require('../controllers/conferenceController');
const donationController = require('../controllers/donationController');

const router = express.Router();

router.get('/churches', asyncHandler(frontendController.listPublicChurches));
router.get('/conferences', asyncHandler(conferenceController.listPublicConferences));
router.get('/events', asyncHandler(eventController.listPublicGlobal));
router.post('/donations', asyncHandler(donationController.donatePublic));

module.exports = router;
