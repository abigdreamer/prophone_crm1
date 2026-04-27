import { Router } from 'express';
import { trackOpen, trackClick } from '../controllers/tracking.controller.js';

const router = Router();
router.get('/o/:id', trackOpen);
router.get('/c/:id', trackClick);
export default router;
