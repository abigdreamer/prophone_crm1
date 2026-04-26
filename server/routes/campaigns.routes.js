import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  addRecipients,
  listRecipients,
  removeAllRecipients,
  sendCampaign,
  pauseCampaign,
  resumeCampaign,
} from '../controllers/campaigns.controller.js';

const router = Router();

router.use(requireAuth);

// Campaign CRUD
router.get('/',    listCampaigns);
router.get('/:id', getCampaign);
router.post('/',   createCampaign);
router.put('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);

// Recipients management
router.get('/:id/recipients',    listRecipients);
router.post('/:id/recipients',   addRecipients);
router.delete('/:id/recipients', removeAllRecipients);

// Campaign lifecycle
router.post('/:id/send',   sendCampaign);
router.post('/:id/pause',  pauseCampaign);
router.post('/:id/resume', resumeCampaign);

export default router;
