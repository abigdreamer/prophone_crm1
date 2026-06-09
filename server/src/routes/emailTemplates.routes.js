import { Router } from 'express';
import requireAuth from '../middleware/auth.middleware.js';
import {
  checkSchema,
  listTemplates,
  getTemplate,
  getTemplatePublic,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  cancelTemplate,
  restoreTemplate,
  duplicateTemplate,
  sendTestEmail,
  importHtml,
} from '../controllers/emailTemplates.controller.js';

const router = Router();

// Public routes — no auth required
router.get('/check-schema', checkSchema);
router.get('/:id/public',   getTemplatePublic);

router.use(requireAuth);

router.post('/import',          importHtml);   // sanitize + validate HTML, no DB write
router.get('/',                 listTemplates);
router.get('/:id',              getTemplate);
router.post('/',                createTemplate);
router.put('/:id',              updateTemplate);
router.delete('/:id',           deleteTemplate);
router.post('/:id/cancel',      cancelTemplate);
router.post('/:id/restore',     restoreTemplate);
router.post('/:id/duplicate',   duplicateTemplate);
router.post('/:id/send-test',   sendTestEmail);

export default router;
