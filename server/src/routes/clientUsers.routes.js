import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import requireAuth from '../middleware/auth.middleware.js';
import { listClientUsers, createClientUser, updateClientUser, deleteClientUser } from '../controllers/clientUsers.controller.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/',         asyncHandler(listClientUsers));
router.post('/',        asyncHandler(createClientUser));
router.patch('/:userId', asyncHandler(updateClientUser));
router.delete('/:userId', asyncHandler(deleteClientUser));

export default router;
