import { Router } from 'express';
import { trackOpen, trackClick, handleUnsubscribe, handleUnsubscribePost } from '../controllers/email.controller.js';

const router = Router();

// No auth — these are hit by email clients and mail servers
router.get('/track/open',    trackOpen);
router.get('/track/click',   trackClick);
router.get('/unsubscribe',   handleUnsubscribe);
router.post('/unsubscribe',  handleUnsubscribePost);

export default router;
