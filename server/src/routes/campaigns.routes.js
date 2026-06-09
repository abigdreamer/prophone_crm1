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
  searchCampaignLeads,
  removeRecipients,
  sendCampaign,
  sendToContacts,
  resendCampaign,
  getCampaignAnalytics,
  exportCampaign,
  listPublishedTemplates,
  dryRunCampaignSend,
  resubscribeRecipient,
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

router.get('/:id/leads/search',       searchCampaignLeads);
router.get('/:id/recipients',         listRecipients);
router.post('/:id/recipients',        addRecipients);
router.delete('/:id/recipients',      removeRecipients);
router.get('/:id/recipients/preview', previewRecipients);

router.get( '/:id/send/dry-run',                dryRunCampaignSend);
router.post('/:id/send',                        sendCampaign);
router.post('/:id/send-to',                     sendToContacts);
router.post('/:id/resend',                      resendCampaign);
router.post('/:id/recipients/:rid/resubscribe', resubscribeRecipient);
router.get( '/:id/analytics',                   getCampaignAnalytics);
router.get( '/:id/export',                      exportCampaign);

export default router;
