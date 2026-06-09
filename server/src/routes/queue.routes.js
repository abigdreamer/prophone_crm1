import { Router } from 'express';
import requireAuth from '../middleware/auth.middleware.js';
import {
  getQueue,
  createQueue,
  updateQueue,
  pauseQueue,
  resumeQueue,
  cancelQueue,
  getNextRunRecipients,
  manageNextRunRecipients,
} from '../controllers/queueController.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/',        getQueue);
router.post('/',       createQueue);
router.patch('/',      updateQueue);
router.delete('/',     cancelQueue);
router.post('/pause',  pauseQueue);
router.post('/resume', resumeQueue);
router.get('/next-run-recipients',   getNextRunRecipients);
router.patch('/next-run-recipients', manageNextRunRecipients);

export default router;
