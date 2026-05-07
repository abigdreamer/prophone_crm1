import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import requireAuth from '../middleware/auth.middleware.js';
import { listClients, listCanceledClients, getClient, createClient, updateClient, cancelClient, restoreClient, getClientActivities } from '../controllers/clients.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/canceled',              asyncHandler(listCanceledClients));
router.get('/',                      asyncHandler(listClients));
router.get('/:id',                   asyncHandler(getClient));
router.post('/',                     asyncHandler(createClient));
router.patch('/:id',                 asyncHandler(updateClient));
router.post('/:id/cancel',           asyncHandler(cancelClient));
router.post('/:id/restore',          asyncHandler(restoreClient));
router.get('/:id/client-activities', asyncHandler(getClientActivities));

export default router;
