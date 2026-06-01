import { Router } from 'express';
import requireAuth from '../middleware/auth.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import { listUdfs, createUdf, updateUdf, deleteUdf } from '../controllers/udf.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/',       asyncHandler(listUdfs));
router.post('/',      asyncHandler(createUdf));
router.patch('/:id',  asyncHandler(updateUdf));
router.delete('/:id', asyncHandler(deleteUdf));

export default router;
