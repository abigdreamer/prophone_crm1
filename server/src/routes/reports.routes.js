import { Router } from 'express';
import {
  getProjectAnalytics,
  getEventDetail,
  getClientAnalytics,
  getClientCharts,
  getClientEventDetail,
} from '../controllers/reports.controller.js';
import requireAuth from '../middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);

router.get('/posthog/:project',             getProjectAnalytics);
router.get('/posthog/:project/event/:uuid', getEventDetail);
router.get('/analytics',                    getClientAnalytics);
router.get('/analytics/charts',             getClientCharts);
router.get('/analytics/event/:uuid',        getClientEventDetail);

export default router;
