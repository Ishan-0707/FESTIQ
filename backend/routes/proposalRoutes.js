import express from 'express';
import { requireAuth, requireManager } from '../middleware/authMiddleware.js';
import {
  submitProposal,
  trackProposal,
  submitClarification,
  getAllProposalsAdmin,
  getProposalByIdAdmin,
  updateProposalStatusAdmin,
  recordCollegeVerificationAdmin,
  recordFeasibilityAssessmentAdmin,
  publishProposalEventAdmin
} from '../controllers/proposalController.js';

const router = express.Router();

// Public routes (no login required)
router.post('/', submitProposal);
router.post('/track', trackProposal);
router.post('/clarify', submitClarification);

// Manager administrative routes (strictly guarded)
router.get('/', requireAuth, requireManager, getAllProposalsAdmin);
router.get('/:id', requireAuth, requireManager, getProposalByIdAdmin);
router.patch('/:id/status', requireAuth, requireManager, updateProposalStatusAdmin);
router.post('/:id/verify-college', requireAuth, requireManager, recordCollegeVerificationAdmin);
router.post('/:id/feasibility', requireAuth, requireManager, recordFeasibilityAssessmentAdmin);
router.post('/:id/publish', requireAuth, requireManager, publishProposalEventAdmin);

export default router;

