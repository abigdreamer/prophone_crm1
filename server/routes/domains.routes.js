import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listDomains,
  getDomain,
  createDomain,
  updateDomain,
  verifyDomain,
  deleteDomain,
  patchDomainTracking,
  configureTrackingSubdomain,
} from '../controllers/domains.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/',             listDomains);
router.get('/:id',          getDomain);
router.post('/',            createDomain);
router.put('/:id',          updateDomain);
router.post('/:id/verify',    verifyDomain);
router.patch('/:id/tracking',            patchDomainTracking);
router.post('/:id/tracking-subdomain',   configureTrackingSubdomain);
router.delete('/:id',                    deleteDomain);

export default router;
