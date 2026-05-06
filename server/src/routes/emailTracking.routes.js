import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { trackOpen, trackClick, unsubscribe } from '../controllers/emailTracking.controller.js';

const router = Router();

// All routes are public (no auth) — they're accessed from email clients
router.get('/track/open',  asyncHandler(trackOpen));
router.get('/track/click', asyncHandler(trackClick));
router.get('/unsubscribe', asyncHandler(unsubscribe));

export default router;
