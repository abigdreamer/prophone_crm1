import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { addClient } from '../services/sseService.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const cleanup = addClient(req.user.prophone_id, res);

  const ping = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(ping); }
  }, 25_000);

  req.on('close', () => { clearInterval(ping); cleanup(); });
});

export default router;
