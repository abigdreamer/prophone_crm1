import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import requireAuth, { requireClientAuth } from '../middleware/auth.middleware.js';
import { login, me, publicUsers, clientLogin, clientMe } from '../controllers/auth.controller.js';

const router = Router();

router.get('/users',         asyncHandler(publicUsers));
router.post('/login',        asyncHandler(login));
router.get('/me',            requireAuth, asyncHandler(me));

// Client portal auth
router.post('/client-login', asyncHandler(clientLogin));
router.get('/client-me',     requireClientAuth, asyncHandler(clientMe));

export default router;
