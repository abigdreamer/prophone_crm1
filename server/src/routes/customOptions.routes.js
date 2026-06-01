import { Router } from 'express';
import requireAuth from '../middleware/auth.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  listCustomSorts, createCustomSort, updateCustomSort, deleteCustomSort,
  listCustomFilters, createCustomFilter, updateCustomFilter, deleteCustomFilter,
} from '../controllers/customOptions.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/sorts',          asyncHandler(listCustomSorts));
router.post('/sorts',         asyncHandler(createCustomSort));
router.patch('/sorts/:id',    asyncHandler(updateCustomSort));
router.delete('/sorts/:id',   asyncHandler(deleteCustomSort));

router.get('/filters',        asyncHandler(listCustomFilters));
router.post('/filters',       asyncHandler(createCustomFilter));
router.patch('/filters/:id',  asyncHandler(updateCustomFilter));
router.delete('/filters/:id', asyncHandler(deleteCustomFilter));

export default router;
