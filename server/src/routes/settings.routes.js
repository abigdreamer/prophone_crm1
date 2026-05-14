import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import requireAuth from '../middleware/auth.middleware.js';
import {
  getSettings,
  saveSettings,
  getEmailProviderSettings,
  saveEmailProviderSettings,
} from '../controllers/settings.controller.js';

const router = Router();

router.get('/',                requireAuth, asyncHandler(getSettings));
router.put('/',                requireAuth, asyncHandler(saveSettings));
router.get('/email-provider',  requireAuth, asyncHandler(getEmailProviderSettings));
router.put('/email-provider',  requireAuth, asyncHandler(saveEmailProviderSettings));

export default router;
