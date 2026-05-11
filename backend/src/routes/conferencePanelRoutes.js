const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireConferenceLeader } = require('../middleware/conferenceLeader');
const { asyncHandler } = require('../utils/asyncHandler');
const conferencePanelController = require('../controllers/conferencePanelController');

const router = express.Router();

router.use(authenticate);
router.use(requireConferenceLeader);

router.get('/overview', asyncHandler(conferencePanelController.getOverview));

module.exports = router;
