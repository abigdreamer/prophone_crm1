const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requireAuth = require('../middleware/auth.middleware');
const { login, me, publicUsers } = require('../controllers/auth.controller');

const router = Router();

router.get('/users',  asyncHandler(publicUsers));
router.post('/login', asyncHandler(login));
router.get('/me',     requireAuth, asyncHandler(me));

module.exports = router;
