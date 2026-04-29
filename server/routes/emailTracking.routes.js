import { Router } from 'express';
import { trackEmailOpen, trackEmailClick } from '../controllers/tracking.controller.js';

const router = Router();
router.get('/open',  trackEmailOpen);
router.get('/click', trackEmailClick);
export default router;
