import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import requireAuth from '../middleware/auth.middleware.js';
import { listClients, getClient, createClient, updateClient } from '../controllers/clients.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/',      asyncHandler(listClients));
router.get('/:id',   asyncHandler(getClient));
router.post('/',     asyncHandler(createClient));
router.patch('/:id', asyncHandler(updateClient));

export default router;
