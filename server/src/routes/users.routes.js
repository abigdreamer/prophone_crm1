const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requireAuth = require('../middleware/auth.middleware');
const { listUsers, getUser } = require('../controllers/users.controller');

const router = Router();

router.use(requireAuth);

router.get('/',    asyncHandler(listUsers));
router.get('/:id', asyncHandler(getUser));

module.exports = router;
