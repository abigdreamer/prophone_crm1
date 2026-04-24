import { Router } from 'express';
import { requireAuth }       from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin.js';
import {
  listCompanies,
  createCompany,
  getCompany,
  updateCompany,
  deleteCompany,
} from '../controllers/companies.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/',                  requireSuperAdmin, listCompanies);
router.post('/',                 requireSuperAdmin, createCompany);
router.get('/:prophone_id',      getCompany);
router.put('/:prophone_id',      updateCompany);
router.delete('/:prophone_id',   requireSuperAdmin, deleteCompany);

export default router;
