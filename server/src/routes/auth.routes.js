import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import requireAuth from '../middleware/auth.middleware.js';
import { login, me, publicUsers } from '../controllers/auth.controller.js';

const router = Router();

router.get('/users',  asyncHandler(publicUsers));
router.post('/login', asyncHandler(login));
router.get('/me',     requireAuth, asyncHandler(me));

export default router;
