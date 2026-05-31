import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { requireClientAuth } from '../middleware/auth.middleware.js';
import { getDashboard, getLeads, getLead, getCampaigns, getCampaignDetail, getProfile, updateProfile } from '../controllers/clientPortal.controller.js';

const router = Router();

router.use(requireClientAuth);

router.get('/dashboard',          asyncHandler(getDashboard));
router.get('/leads',              asyncHandler(getLeads));
router.get('/leads/:id',          asyncHandler(getLead));
router.get('/campaigns',          asyncHandler(getCampaigns));
router.get('/campaigns/:id',      asyncHandler(getCampaignDetail));
router.get('/profile',            asyncHandler(getProfile));
router.patch('/profile',          asyncHandler(updateProfile));

export default router;
