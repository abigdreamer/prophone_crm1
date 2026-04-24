import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { login, quickUsers, getUsers, createUser, updateUser, deleteUser } from '../controllers/auth.controller.js';

const router = Router();

// Public
router.post('/auth/login',        login);
router.get('/auth/quick-users',   quickUsers);

// Protected
router.get('/users',          requireAuth, getUsers);
router.post('/users',         requireAuth, createUser);
router.put('/users/:id',      requireAuth, updateUser);
router.delete('/users/:id',   requireAuth, deleteUser);

export default router;
