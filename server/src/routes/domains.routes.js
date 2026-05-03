const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requireAuth  = require('../middleware/auth.middleware');
const { listDomains, addDomain, deleteDomain, verifyDomain } = require('../controllers/domains.controller');

const router = Router();

router.get('/',      requireAuth, asyncHandler(listDomains));
router.post('/',     requireAuth, asyncHandler(addDomain));
router.delete('/:id', requireAuth, asyncHandler(deleteDomain));
router.post('/:id/verify', requireAuth, asyncHandler(verifyDomain));

module.exports = router;
