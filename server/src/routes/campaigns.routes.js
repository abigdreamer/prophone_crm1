import { Router } from 'express';
import requireAuth from '../middleware/auth.middleware.js';
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  cancelCampaign,
  restoreCampaign,
  duplicateCampaign,
  listRecipients,
  addRecipients,
  previewRecipients,
  removeRecipients,
  sendCampaign,
  resendCampaign,
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
router.delete('/:id',       deleteCampaign);
router.post('/:id/cancel',    cancelCampaign);
router.post('/:id/restore',   restoreCampaign);
router.post('/:id/duplicate', duplicateCampaign);

router.get('/:id/recipients',         listRecipients);
router.post('/:id/recipients',        addRecipients);
router.delete('/:id/recipients',      removeRecipients);
router.get('/:id/recipients/preview', previewRecipients);

router.post('/:id/send',      sendCampaign);
router.post('/:id/resend',    resendCampaign);
router.get('/:id/analytics',  getCampaignAnalytics);

export default router;
