import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import requireAuth from '../middleware/auth.middleware.js';
import {
  listMonitors,
  createMonitor,
  updateMonitor,
  deleteMonitor,
  listPosts,
  generateDraft,
  updatePost,
  getStats,
} from '../controllers/reddit.controller.js';

const router = Router();

// Monitors
router.get('/monitors',       requireAuth, asyncHandler(listMonitors));
router.post('/monitors',      requireAuth, asyncHandler(createMonitor));
router.patch('/monitors/:id', requireAuth, asyncHandler(updateMonitor));
router.delete('/monitors/:id', requireAuth, asyncHandler(deleteMonitor));

// Posts
router.get('/posts',              requireAuth, asyncHandler(listPosts));
router.post('/posts/:id/draft',   requireAuth, asyncHandler(generateDraft));
router.patch('/posts/:id',        requireAuth, asyncHandler(updatePost));

// Stats
router.get('/stats', requireAuth, asyncHandler(getStats));

export default router;
