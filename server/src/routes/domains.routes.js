const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requireAuth  = require('../middleware/auth.middleware');
const { listDomains, addDomain, deleteDomain } = require('../controllers/domains.controller');

const router = Router();

router.get('/',      requireAuth, asyncHandler(listDomains));
router.post('/',     requireAuth, asyncHandler(addDomain));
router.delete('/:id', requireAuth, asyncHandler(deleteDomain));

module.exports = router;
