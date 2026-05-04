import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import requireAuth from '../middleware/auth.middleware.js';
import { listUsers, getUser } from '../controllers/users.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/',    asyncHandler(listUsers));
router.get('/:id', asyncHandler(getUser));

export default router;
