import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import requireAuth from '../middleware/auth.middleware.js';
import { listDomains, addDomain, deleteDomain, verifyDomain, updateDomain, cancelDomain, restoreDomain } from '../controllers/domains.controller.js';

const router = Router();

router.get('/',               requireAuth, asyncHandler(listDomains));
router.post('/',              requireAuth, asyncHandler(addDomain));
router.patch('/:id',          requireAuth, asyncHandler(updateDomain));
router.delete('/:id',         requireAuth, asyncHandler(deleteDomain));
router.post('/:id/verify',    requireAuth, asyncHandler(verifyDomain));
router.post('/:id/cancel',    requireAuth, asyncHandler(cancelDomain));
router.post('/:id/restore',   requireAuth, asyncHandler(restoreDomain));

export default router;
