import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import requireAuth from '../middleware/auth.middleware.js';
import { getSettings, saveSettings } from '../controllers/settings.controller.js';

const router = Router();

router.get('/',  requireAuth, asyncHandler(getSettings));
router.put('/',  requireAuth, asyncHandler(saveSettings));

export default router;
