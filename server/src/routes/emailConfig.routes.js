import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import requireAuth from '../middleware/auth.middleware.js';
import {
  getEmailConfig,
  saveEmailConfig,
  activateEmailConfig,
  testEmailConfig,
} from '../controllers/emailConfig.controller.js';

const router = Router();

router.get(   '/',          requireAuth, asyncHandler(getEmailConfig));
router.post(  '/',          requireAuth, asyncHandler(saveEmailConfig));
router.post(  '/activate',  requireAuth, asyncHandler(activateEmailConfig));
router.post(  '/test',      requireAuth, asyncHandler(testEmailConfig));

export default router;
