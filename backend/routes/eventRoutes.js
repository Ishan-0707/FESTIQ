import express from 'express';
import { getAllEvents, getEventById, createEvent, updateEvent, downloadEventPdf } from '../controllers/eventController.js';
import { requireAuth, requireManager } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.get('/:id/pdf', downloadEventPdf);
router.post('/', requireAuth, requireManager, createEvent);
router.put('/:id', requireAuth, requireManager, updateEvent);
router.patch('/:id', requireAuth, requireManager, updateEvent);

export default router;

