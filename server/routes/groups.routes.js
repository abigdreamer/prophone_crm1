import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listGroups, createGroup, updateGroup, deleteGroup } from '../controllers/groups.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/',      listGroups);
router.post('/',     createGroup);
router.put('/:id',   updateGroup);
router.delete('/:id', deleteGroup);

export default router;
