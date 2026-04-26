import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  checkSchema,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  sendTestEmail,
} from '../controllers/emailTemplates.controller.js';

const router = Router();

// check-schema is public (used during app boot before user logs in)
router.get('/check-schema', checkSchema);

router.use(requireAuth);

router.get('/',                listTemplates);
router.get('/:id',             getTemplate);
router.post('/',               createTemplate);
router.put('/:id',             updateTemplate);
router.delete('/:id',          deleteTemplate);
router.post('/:id/duplicate',  duplicateTemplate);
router.post('/:id/send-test',  sendTestEmail);

export default router;
