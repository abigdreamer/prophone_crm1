import { Router } from 'express';
import requireAuth from '../middleware/auth.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  listScoringRules,
  getScoringRule,
  createScoringRule,
  updateScoringRule,
  deleteScoringRule,
} from '../controllers/scoringRules.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/',      asyncHandler(listScoringRules));
router.get('/:id',   asyncHandler(getScoringRule));
router.post('/',     asyncHandler(createScoringRule));
router.patch('/:id', asyncHandler(updateScoringRule));
router.delete('/:id', asyncHandler(deleteScoringRule));

export default router;
