import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/posthogProjects.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/',      listProjects);
router.post('/',     createProject);
router.put('/:id',   updateProject);
router.delete('/:id', deleteProject);

export default router;
