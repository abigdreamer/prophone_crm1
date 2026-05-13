import { Router } from 'express';
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/posthogProjects.controller.js';
import requireAuth from '../middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);

router.get('/',      listProjects);
router.post('/',     createProject);
router.put('/:id',   updateProject);
router.delete('/:id', deleteProject);

export default router;
