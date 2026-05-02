const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { login, publicUsers } = require('../controllers/auth.controller');

const router = Router();

router.get('/users',  asyncHandler(publicUsers));
router.post('/login', asyncHandler(login));

module.exports = router;
