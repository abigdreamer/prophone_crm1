import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listDomains,
  getDomain,
  createDomain,
  updateDomain,
  verifyDomain,
  deleteDomain,
} from '../controllers/domains.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/',             listDomains);
router.get('/:id',          getDomain);
router.post('/',            createDomain);
router.put('/:id',          updateDomain);
router.post('/:id/verify',  verifyDomain);
router.delete('/:id',       deleteDomain);

export default router;
