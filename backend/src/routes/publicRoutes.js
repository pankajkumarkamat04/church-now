const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const frontendController = require('../controllers/frontendController');
const eventController = require('../controllers/eventController');
const galleryController = require('../controllers/galleryController');

const router = express.Router();

router.get('/site', asyncHandler(frontendController.getPublicGlobalSite));
router.get('/:churchSlug/site', asyncHandler(frontendController.getPublicSite));
router.get('/:churchSlug/events', asyncHandler(eventController.listPublic));
router.get('/:churchSlug/events/:eventSlug', asyncHandler(eventController.getPublicOne));
router.get('/:churchSlug/gallery', asyncHandler(galleryController.listPublic));

module.exports = router;
