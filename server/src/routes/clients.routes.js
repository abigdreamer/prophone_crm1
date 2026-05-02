const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requireAuth = require('../middleware/auth.middleware');
const { listClients, getClient, createClient, updateClient } = require('../controllers/clients.controller');

const router = Router();

router.use(requireAuth);

router.get('/',     asyncHandler(listClients));
router.get('/:id',  asyncHandler(getClient));
router.post('/',    asyncHandler(createClient));
router.patch('/:id',asyncHandler(updateClient));

module.exports = router;
