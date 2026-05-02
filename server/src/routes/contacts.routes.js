const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requireAuth = require('../middleware/auth.middleware');
const { listContacts, getContact, createContact, updateContact, deleteContact } = require('../controllers/contacts.controller');
const { addActivity } = require('../controllers/activities.controller');

const router = Router();

router.use(requireAuth);

router.get('/',              asyncHandler(listContacts));
router.get('/:id',           asyncHandler(getContact));
router.post('/',             asyncHandler(createContact));
router.patch('/:id',         asyncHandler(updateContact));
router.delete('/:id',        asyncHandler(deleteContact));
router.post('/:contactId/activities', asyncHandler(addActivity));

module.exports = router;
