import { Router } from 'express';
import requireAuth from '../middleware/auth.middleware.js';
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  listRecipients,
  addRecipients,
  previewRecipients,
  removeRecipients,
  sendCampaign,
  getCampaignAnalytics,
  listPublishedTemplates,
} from '../controllers/campaigns.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/templates/published', listPublishedTemplates);

router.get('/',    listCampaigns);
router.get('/:id', getCampaign);
router.post('/',   createCampaign);
router.patch('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);

router.get('/:id/recipients',         listRecipients);
router.post('/:id/recipients',        addRecipients);
router.delete('/:id/recipients',      removeRecipients);
router.get('/:id/recipients/preview', previewRecipients);

router.post('/:id/send',      sendCampaign);
router.get('/:id/analytics',  getCampaignAnalytics);

export default router;
