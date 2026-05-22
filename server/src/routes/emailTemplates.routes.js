import { Router } from 'express';
import requireAuth from '../middleware/auth.middleware.js';
import {
  checkSchema,
  listTemplates,
  getTemplate,
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

// check-schema is public (used during app boot before user logs in)
router.get('/check-schema', checkSchema);

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
