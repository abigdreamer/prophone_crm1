import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  addActivity,
  importContacts,
} from '../controllers/contacts.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/',                listContacts);
router.get('/:id',             getContact);
router.post('/',               createContact);
router.put('/:id',             updateContact);
router.delete('/:id',          deleteContact);
router.post('/import',         importContacts);
router.post('/:id/activities', addActivity);

export default router;
