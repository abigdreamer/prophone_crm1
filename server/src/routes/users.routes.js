import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import requireAuth from '../middleware/auth.middleware.js';
import { listUsers, getUser, createUser, updateUser, deleteUser, listAllPortalUsers } from '../controllers/users.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/',             asyncHandler(listUsers));
router.post('/',            asyncHandler(createUser));
router.get('/portal-users', asyncHandler(listAllPortalUsers));
router.get('/:id',          asyncHandler(getUser));
router.patch('/:id',        asyncHandler(updateUser));
router.delete('/:id',       asyncHandler(deleteUser));

export default router;
