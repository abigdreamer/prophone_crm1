import { Router } from 'express';
import requireAuth  from '../middleware/auth.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  redirectTemplateLink,
  getTemplateLinks,
} from '../controllers/templateLinks.controller.js';

const router = Router();

// Public: hit by email clients — no auth
router.get('/:id/redirect', asyncHandler(redirectTemplateLink));

// Authenticated: list links for a template (pass ?templateId=&clientId= as query)
router.get('/', requireAuth, asyncHandler(getTemplateLinks));

export default router;
