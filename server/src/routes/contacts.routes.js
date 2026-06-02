import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import requireAuth from '../middleware/auth.middleware.js';
import { listContacts, getContact, createContact, updateContact, deleteContact, getContactCounts, importContacts, listCanceledContacts, cancelContact, restoreContact, getContactClientActivities, getDashboardSummary, recalculateAllScores, getContactUdfs, updateContactUdfs } from '../controllers/contacts.controller.js';
import { addActivity } from '../controllers/activities.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/counts',              asyncHandler(getContactCounts));
router.post('/recalculate-scores', asyncHandler(recalculateAllScores));
router.get('/dashboard-summary',   asyncHandler(getDashboardSummary));
router.get('/canceled',            asyncHandler(listCanceledContacts));
router.get('/',                    asyncHandler(listContacts));
router.get('/:id',                 asyncHandler(getContact));
router.post('/',                   asyncHandler(createContact));
router.patch('/:id',               asyncHandler(updateContact));
router.delete('/:id',              asyncHandler(deleteContact));
router.post('/import',             asyncHandler(importContacts));
router.post('/:id/cancel',              asyncHandler(cancelContact));
router.post('/:id/restore',             asyncHandler(restoreContact));
router.get('/:id/client-activities',    asyncHandler(getContactClientActivities));
router.get('/:id/udfs',                 asyncHandler(getContactUdfs));
router.put('/:id/udfs',                 asyncHandler(updateContactUdfs));
router.post('/:contactId/activities',   asyncHandler(addActivity));

export default router;
