import { Router } from 'express';
import requireAuth from '../middleware/auth.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  createInteractiveSession,
  getContactSessions,
} from '../controllers/interactive.controller.js';

const router = Router();

router.post('/',                     requireAuth, asyncHandler(createInteractiveSession));
router.get('/contact/:contactId',    requireAuth, asyncHandler(getContactSessions));

export default router;
