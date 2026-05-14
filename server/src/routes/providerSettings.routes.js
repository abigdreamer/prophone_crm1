import { Router } from 'express';
import asyncHandler  from '../utils/asyncHandler.js';
import requireAuth   from '../middleware/auth.middleware.js';
import {
  listProviderStatuses,
  getOneProviderStatus,
  updateApiKey,
  updateWebhookSecret,
} from '../controllers/providerSettings.controller.js';

const router = Router();

// All provider-settings routes require authentication
router.get('/',                             requireAuth, asyncHandler(listProviderStatuses));
router.get('/:provider',                    requireAuth, asyncHandler(getOneProviderStatus));
router.put('/:provider/api-key',            requireAuth, asyncHandler(updateApiKey));
router.put('/:provider/webhook-secret',     requireAuth, asyncHandler(updateWebhookSecret));

export default router;
