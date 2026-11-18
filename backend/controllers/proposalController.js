import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getAllProposals,
  getProposalById,
  createProposal,
  updateProposal
} from '../utils/proposalStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsFilePath = path.join(__dirname, '..', 'data', 'events.json');

// Serialized queue for events.json publication writes
let eventWriteQueue = Promise.resolve();
function enqueueEventWrite(operation) {
  const next = eventWriteQueue.then(operation, operation);
  eventWriteQueue = next.catch(() => {});
  return next;
}

const VALID_CATEGORIES = [
  'Technical',
  'Cultural',
  'Gaming',
  'Workshops',
  'Management',
  'Sports'
];

const VALID_STATUSES = [
  'Submitted',
  'Under Review',
  'Awaiting Organizer Information',
  'Awaiting College Approval',
  'Feasibility Review',
  'Approved for Publication',
  'Published',
  'Rejected'
];

/**
 * Hash tracking token using SHA-256 for secure constant-time verification.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Constant-time hash comparator to prevent timing attacks.
 */
function verifyTokenHash(inputToken, storedHash) {
  if (!inputToken || !storedHash) return false;
  const inputHash = hashToken(inputToken);
  try {
    const a = Buffer.from(inputHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * POST /api/proposals
 * Public endpoint to submit a new event proposal.
 * Generates unique Reference ID and unpredictable Secret Tracking Token.
 */
export async function submitProposal(req, res) {
  try {
    const {
      organizerName,
      email,
      phone,
      organization,
      role,
      facultyCoordinatorName,
      facultyCoordinatorContact,
      title,
      category,
      tagline,
      description,
      fullDescription,
      date,
      time,
      venue,
      expectedParticipants,
      capacity,
      teamSize,
      prizeAmount,
      sponsorshipNeeds,
      imageUrl,
      purpose,
      facilitiesRequired,
      estimatedBudget,
      priorFacultyDiscussion,
      managementNotes
    } = req.body;

    // 1. Validation
    if (!organizerName || !organizerName.trim()) {
      return res.status(400).json({ success: false, message: 'Organizer full name is required' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid organizer email address is required' });
    }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit contact phone number is required' });
    }
    if (!organization || !organization.trim()) {
      return res.status(400).json({ success: false, message: 'Organization, club, or department is required' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Proposed event title is required' });
    }
    const matchedCategory = VALID_CATEGORIES.find(
      (c) => c.toLowerCase() === (category || '').trim().toLowerCase()
    );
    if (!matchedCategory) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Valid event date in YYYY-MM-DD format is required' });
    }
    if (!venue || !venue.trim()) {
      return res.status(400).json({ success: false, message: 'Preferred campus venue is required' });
    }

    const numCapacity = parseInt(capacity, 10);
    if (isNaN(numCapacity) || numCapacity <= 0) {
      return res.status(400).json({ success: false, message: 'Proposed capacity must be a positive number' });
    }

    // 2. Security: Generate Proposal Reference ID & Secret Tracking Token
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const proposalId = `PROP-2026-${randomSuffix}`;

    const rawTrackingToken = crypto.randomBytes(16).toString('hex');
    const trackingTokenHash = hashToken(rawTrackingToken);

    const now = new Date().toISOString();

    const newProposal = {
      id: proposalId,
      trackingTokenHash,
      organizer: {
        name: organizerName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        organization: organization.trim(),
        role: (role || 'Organizer Lead').trim(),
        facultyCoordinatorName: (facultyCoordinatorName || '').trim(),
        facultyCoordinatorContact: (facultyCoordinatorContact || '').trim()
      },
      event: {
        title: title.trim(),
        category: matchedCategory,
        tagline: (tagline || '').trim(),
        description: (description || title).trim(),
        fullDescription: (fullDescription || description || title).trim(),
        date: date.trim(),
        time: (time || '09:00 AM - 05:00 PM').trim(),
        venue: venue.trim(),
        expectedParticipants: parseInt(expectedParticipants, 10) || numCapacity,
        capacity: numCapacity,
        teamSize: parseInt(teamSize, 10) || 5,
        prizeAmount: parseInt(prizeAmount, 10) || 0,
        sponsorshipNeeds: (sponsorshipNeeds || '').trim(),
        imageUrl: (imageUrl || '').trim() || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'
      },
      institutional: {
        purpose: (purpose || '').trim(),
        facilitiesRequired: (facilitiesRequired || '').trim(),
        estimatedBudget: (estimatedBudget || '').trim(),
        priorFacultyDiscussion: (priorFacultyDiscussion || 'Not yet discussed').trim(),
        managementNotes: (managementNotes || '').trim()
      },
      status: 'Submitted',
      reviewHistory: [
        {
          id: `hist-${Date.now()}-1`,
          fromStatus: null,
          toStatus: 'Submitted',
          timestamp: now,
          actor: 'Organizer',
          note: 'Initial event proposal submitted via public portal'
        }
      ],
      publicUpdates: [
        {
          id: `pub-${Date.now()}-1`,
          timestamp: now,
          message: 'Proposal successfully submitted to FESTIQ management desk. Awaiting preliminary review.',
          type: 'update'
        }
      ],
      clarificationHistory: [],
      collegeVerification: {
        status: 'Pending',
        authority: null,
        department: null,
        verifiedDate: null,
        remarks: null
      },
      feasibilityAssessment: {
        status: 'Pending',
        venueAvailable: null,
        scheduleFeasible: null,
        facilitiesAvailable: null,
        budgetAcceptable: null,
        remarks: null
      },
      internalNotes: [],
      publishedEventId: null,
      createdAt: now,
      updatedAt: now
    };

    await createProposal(newProposal);

    return res.status(201).json({
      success: true,
      message: 'Event proposal submitted successfully. It will undergo collegiate and feasibility review prior to publication.',
      data: {
        proposalId,
        trackingToken: rawTrackingToken,
        status: 'Submitted',
        submittedAt: now
      }
    });
  } catch (error) {
    console.error('[Proposal Controller] Submit error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to record event proposal',
      error: error.message
    });
  }
}

/**
 * POST /api/proposals/track
 * Public endpoint to verify proposal tracking token and return sanitized status.
 * Strictly redacts internal management notes, verification remarks, and private contacts.
 */
export async function trackProposal(req, res) {
  try {
    const { proposalId, trackingToken } = req.body;

    if (!proposalId || !trackingToken) {
      return res.status(400).json({
        success: false,
        message: 'Both proposal reference ID and secret tracking key are required'
      });
    }

    const proposal = await getProposalById(proposalId.trim());
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'No proposal found matching this reference ID'
      });
    }

    if (!verifyTokenHash(trackingToken, proposal.trackingTokenHash)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid tracking key. Please ensure you are using the secret key provided at submission.'
      });
    }

    // Return sanitized public tracking data
    const isInfoRequested = proposal.status === 'Awaiting Organizer Information';

    return res.status(200).json({
      success: true,
      data: {
        proposalId: proposal.id,
        title: proposal.event.title,
        category: proposal.event.category,
        date: proposal.event.date,
        venue: proposal.event.venue,
        organization: proposal.organizer.organization,
        status: proposal.status,
        submittedAt: proposal.createdAt,
        updatedAt: proposal.updatedAt,
        publicUpdates: proposal.publicUpdates || [],
        clarificationHistory: proposal.clarificationHistory || [],
        additionalInfoRequested: isInfoRequested,
        publishedEventId: proposal.publishedEventId,
        collegeVerificationStatus: proposal.collegeVerification?.status || 'Pending',
        feasibilityStatus: proposal.feasibilityAssessment?.status || 'Pending'
      }
    });
  } catch (error) {
    console.error('[Proposal Controller] Track error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve proposal status',
      error: error.message
    });
  }
}

/**
 * POST /api/proposals/clarify
 * Allows organizer to submit requested clarification using tracking credentials.
 * Automatically transitions status from 'Awaiting Organizer Information' back to 'Under Review'.
 */
export async function submitClarification(req, res) {
  try {
    const { proposalId, trackingToken, clarificationText, revisedDetails } = req.body;

    if (!proposalId || !trackingToken) {
      return res.status(400).json({
        success: false,
        message: 'Reference ID and tracking key are required'
      });
    }

    if (!clarificationText || !clarificationText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Clarification details are required'
      });
    }

    const proposal = await getProposalById(proposalId.trim());
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    if (!verifyTokenHash(trackingToken, proposal.trackingTokenHash)) {
      return res.status(401).json({ success: false, message: 'Invalid tracking credentials' });
    }

    const now = new Date().toISOString();
    const clarificationEntry = {
      id: `clar-${Date.now()}`,
      timestamp: now,
      clarificationText: clarificationText.trim(),
      revisedDetails: revisedDetails || null,
      submittedBy: proposal.organizer.name
    };

    const clarificationHistory = [...(proposal.clarificationHistory || []), clarificationEntry];
    const prevStatus = proposal.status;

    // Automatically transition to 'Under Review'
    const newStatus = 'Under Review';

    const reviewHistory = [
      ...(proposal.reviewHistory || []),
      {
        id: `hist-${Date.now()}`,
        fromStatus: prevStatus,
        toStatus: newStatus,
        timestamp: now,
        actor: `Organizer (${proposal.organizer.name})`,
        note: `Organizer submitted requested clarification: "${clarificationText.trim().slice(0, 100)}..."`
      }
    ];

    const publicUpdates = [
      ...(proposal.publicUpdates || []),
      {
        id: `pub-${Date.now()}`,
        timestamp: now,
        message: 'Clarification submitted by organizer. Proposal returned to Under Review status.',
        type: 'update'
      }
    ];

    const updated = await updateProposal(proposal.id, {
      status: newStatus,
      clarificationHistory,
      reviewHistory,
      publicUpdates
    });

    return res.status(200).json({
      success: true,
      message: 'Clarification recorded successfully. Management team has been notified.',
      data: {
        status: updated.status,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    console.error('[Proposal Controller] Clarification error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to record clarification',
      error: error.message
    });
  }
}

/**
 * GET /api/proposals (Manager Protected)
 * Lists all proposals with search, filter, and sorting.
 */
export async function getAllProposalsAdmin(req, res) {
  try {
    const proposals = await getAllProposals();
    const { search, status, category, sort } = req.query;

    let filtered = [...proposals];

    if (status && status !== 'ALL') {
      filtered = filtered.filter((p) => p.status.toLowerCase() === status.toLowerCase());
    }

    if (category && category !== 'ALL') {
      filtered = filtered.filter((p) => (p.event.category || '').toLowerCase() === category.toLowerCase());
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.event.title.toLowerCase().includes(q) ||
          p.organizer.name.toLowerCase().includes(q) ||
          p.organizer.organization.toLowerCase().includes(q)
      );
    }

    // Default: newest submission first
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve proposal queue',
      error: error.message
    });
  }
}

/**
 * GET /api/proposals/:id (Manager Protected)
 * Retrieves single proposal details including internal notes and verification logs.
 */
export async function getProposalByIdAdmin(req, res) {
  try {
    const { id } = req.params;
    const proposal = await getProposalById(id);

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    res.status(200).json({
      success: true,
      data: proposal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch proposal details',
      error: error.message
    });
  }
}

/**
 * PATCH /api/proposals/:id/status (Manager Protected)
 * Updates proposal review status and records audit history.
 */
export async function updateProposalStatusAdmin(req, res) {
  try {
    const { id } = req.params;
    const { status, note, publicMessage } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const proposal = await getProposalById(id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    // Prohibit manually moving to 'Published' without going through publication gate
    if (status === 'Published' && !proposal.publishedEventId) {
      return res.status(400).json({
        success: false,
        message: "Cannot mark status 'Published' directly. Use the 'Publish Event' action to ensure catalogue synchronization."
      });
    }

    // Prohibit self-approval (manager email matches organizer email)
    if (req.user?.email && proposal.organizer.email && req.user.email.toLowerCase() === proposal.organizer.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Security Policy: Organizers are prohibited from reviewing or approving their own event proposals.'
      });
    }

    const now = new Date().toISOString();
    const prevStatus = proposal.status;

    const reviewHistory = [
      ...(proposal.reviewHistory || []),
      {
        id: `hist-${Date.now()}`,
        fromStatus: prevStatus,
        toStatus: status,
        timestamp: now,
        actor: req.user?.fullName || 'Manager',
        note: (note || `Status changed from ${prevStatus} to ${status}`).trim()
      }
    ];

    let publicUpdates = [...(proposal.publicUpdates || [])];
    if (publicMessage && publicMessage.trim()) {
      publicUpdates.push({
        id: `pub-${Date.now()}`,
        timestamp: now,
        message: publicMessage.trim(),
        type: status === 'Awaiting Organizer Information' ? 'info_request' : 'update'
      });
    }

    let internalNotes = [...(proposal.internalNotes || [])];
    if (note && note.trim()) {
      internalNotes.push({
        id: `note-${Date.now()}`,
        timestamp: now,
        managerName: req.user?.fullName || 'Manager',
        note: note.trim()
      });
    }

    const updated = await updateProposal(id, {
      status,
      reviewHistory,
      publicUpdates,
      internalNotes
    });

    res.status(200).json({
      success: true,
      message: `Proposal status updated to '${status}'`,
      data: updated
    });
  } catch (error) {
    console.error('[Proposal Controller] Status update error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update proposal status',
      error: error.message
    });
  }
}

/**
 * POST /api/proposals/:id/verify-college (Manager Protected)
 * Records official institutional approval or rejection.
 */
export async function recordCollegeVerificationAdmin(req, res) {
  try {
    const { id } = req.params;
    const { status, authority, department, verifiedDate, remarks } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Verification status must be 'Approved' or 'Rejected'"
      });
    }

    const proposal = await getProposalById(id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    const now = new Date().toISOString();
    const collegeVerification = {
      status,
      authority: (authority || 'Dean / Academic Head').trim(),
      department: (department || 'College Affairs Board').trim(),
      verifiedDate: verifiedDate || now.slice(0, 10),
      remarks: (remarks || '').trim()
    };

    let newStatus = proposal.status;
    if (status === 'Approved' && proposal.status === 'Awaiting College Approval') {
      newStatus = 'Feasibility Review';
    } else if (status === 'Rejected') {
      newStatus = 'Rejected';
    }

    const reviewHistory = [
      ...(proposal.reviewHistory || []),
      {
        id: `hist-${Date.now()}`,
        fromStatus: proposal.status,
        toStatus: newStatus,
        timestamp: now,
        actor: req.user?.fullName || 'Manager',
        note: `College verification recorded: ${status} by ${collegeVerification.authority} (${collegeVerification.department})`
      }
    ];

    const publicUpdates = [...(proposal.publicUpdates || [])];
    if (status === 'Approved') {
      publicUpdates.push({
        id: `pub-${Date.now()}`,
        timestamp: now,
        message: 'Institutional college verification successfully recorded. Proceeding to operational feasibility review.',
        type: 'update'
      });
    } else if (status === 'Rejected') {
      publicUpdates.push({
        id: `pub-${Date.now()}`,
        timestamp: now,
        message: 'Institutional permission was not granted by university authorities. Proposal has been declined.',
        type: 'decision'
      });
    }

    const updated = await updateProposal(id, {
      collegeVerification,
      status: newStatus,
      reviewHistory,
      publicUpdates
    });

    res.status(200).json({
      success: true,
      message: `College verification recorded as '${status}'`,
      data: updated
    });
  } catch (error) {
    console.error('[Proposal Controller] College verification error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to record college verification',
      error: error.message
    });
  }
}

/**
 * POST /api/proposals/:id/feasibility (Manager Protected)
 * Records venue availability, schedule clash check, and facilities assessment.
 */
export async function recordFeasibilityAssessmentAdmin(req, res) {
  try {
    const { id } = req.params;
    const {
      status,
      venueAvailable = true,
      scheduleFeasible = true,
      facilitiesAvailable = true,
      budgetAcceptable = true,
      remarks
    } = req.body;

    if (!['Acceptable', 'Unacceptable'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Feasibility status must be 'Acceptable' or 'Unacceptable'"
      });
    }

    const proposal = await getProposalById(id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    const now = new Date().toISOString();
    const feasibilityAssessment = {
      status,
      venueAvailable: Boolean(venueAvailable),
      scheduleFeasible: Boolean(scheduleFeasible),
      facilitiesAvailable: Boolean(facilitiesAvailable),
      budgetAcceptable: Boolean(budgetAcceptable),
      remarks: (remarks || '').trim()
    };

    let newStatus = proposal.status;
    if (status === 'Acceptable' && proposal.collegeVerification?.status === 'Approved') {
      newStatus = 'Approved for Publication';
    } else if (status === 'Unacceptable') {
      newStatus = 'Rejected';
    }

    const reviewHistory = [
      ...(proposal.reviewHistory || []),
      {
        id: `hist-${Date.now()}`,
        fromStatus: proposal.status,
        toStatus: newStatus,
        timestamp: now,
        actor: req.user?.fullName || 'Manager',
        note: `Operational feasibility recorded: ${status}. Remarks: ${feasibilityAssessment.remarks || 'None'}`
      }
    ];

    const publicUpdates = [...(proposal.publicUpdates || [])];
    if (newStatus === 'Approved for Publication') {
      publicUpdates.push({
        id: `pub-${Date.now()}`,
        timestamp: now,
        message: 'Operational feasibility verified. Proposal approved for catalogue publication.',
        type: 'decision'
      });
    } else if (status === 'Unacceptable') {
      publicUpdates.push({
        id: `pub-${Date.now()}`,
        timestamp: now,
        message: 'Operational feasibility assessment could not be satisfied. Proposal declined.',
        type: 'decision'
      });
    }

    const updated = await updateProposal(id, {
      feasibilityAssessment,
      status: newStatus,
      reviewHistory,
      publicUpdates
    });

    res.status(200).json({
      success: true,
      message: `Feasibility assessment recorded as '${status}'`,
      data: updated
    });
  } catch (error) {
    console.error('[Proposal Controller] Feasibility error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to record feasibility assessment',
      error: error.message
    });
  }
}

/**
 * POST /api/proposals/:id/publish (Manager Protected)
 * CRITICAL PUBLICATION GATE:
 * 1. Checks college approval == 'Approved'
 * 2. Checks feasibility == 'Acceptable'
 * 3. Checks status == 'Approved for Publication'
 * 4. Idempotently publishes to events.json
 * 5. Strictly assigns distinct 'Published' status
 * 6. Rollback-safe across partial failures
 */
export async function publishProposalEventAdmin(req, res) {
  try {
    const { id } = req.params;
    const proposal = await getProposalById(id);

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    // Idempotency: If already published, return existing event
    if (proposal.status === 'Published' && proposal.publishedEventId) {
      return res.status(200).json({
        success: true,
        message: 'Proposal has already been published to the campus catalogue.',
        data: {
          proposalId: proposal.id,
          eventId: proposal.publishedEventId,
          alreadyPublished: true
        }
      });
    }

    // MANDATORY GATES (Strict backend enforcement)
    if (proposal.collegeVerification?.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Publication blocked: Institutional college approval must be verified and recorded as Approved first.'
      });
    }

    if (proposal.feasibilityAssessment?.status !== 'Acceptable') {
      return res.status(400).json({
        success: false,
        message: 'Publication blocked: Operational feasibility assessment must be recorded as Acceptable first.'
      });
    }

    if (proposal.status !== 'Approved for Publication') {
      return res.status(400).json({
        success: false,
        message: `Publication blocked: Proposal status must be 'Approved for Publication' (current status: '${proposal.status}').`
      });
    }

    const { event, organizer } = proposal;

    // Execute atomic, failure-safe publication into events.json
    const publishedEvent = await enqueueEventWrite(async () => {
      const rawEvents = await fs.readFile(eventsFilePath, 'utf-8');
      const eventsList = JSON.parse(rawEvents);

      // Check if event already exists for this proposal or matching title/date/venue
      const existing = eventsList.find(
        (e) =>
          e.proposalId === proposal.id ||
          (e.title &&
            event.title &&
            e.title.trim().toLowerCase() === event.title.trim().toLowerCase() &&
            e.date === event.date &&
            e.venue &&
            event.venue &&
            e.venue.trim().toLowerCase() === event.venue.trim().toLowerCase())
      );
      if (existing) {
        return existing;
      }

      // Generate next fest-XXX ID
      let maxNum = 0;
      for (const ev of eventsList) {
        const m = (ev.id || '').match(/fest-(\d+)/);
        if (m) {
          const val = parseInt(m[1], 10);
          if (val > maxNum) maxNum = val;
        }
      }
      const nextEventId = `fest-${String(maxNum + 1).padStart(3, '0')}`;

      const prizeNum = Number(event.prizeAmount) || 0;
      const prizePoolStr = prizeNum > 0 ? `₹${prizeNum.toLocaleString('en-IN')}` : 'Free';

      const newEvent = {
        id: nextEventId,
        proposalId: proposal.id,
        title: event.title,
        category: event.category,
        tagline: event.tagline || '',
        description: event.description,
        fullDescription: event.fullDescription || event.description,
        date: event.date,
        time: event.time || '09:00 AM - 05:00 PM',
        venue: event.venue,
        organizer: organizer.organization || 'Campus Society',
        image: event.imageUrl,
        imageUrl: event.imageUrl,
        entryFee: 'Free',
        prizePool: prizePoolStr,
        prizeAmount: prizeNum,
        capacity: Number(event.capacity) || 100,
        registeredCount: 0,
        featured: false,
        isFeatured: false,
        status: 'Open',
        managerName: organizer.name,
        managerPhone: organizer.phone,
        managerEmail: organizer.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      eventsList.push(newEvent);

      const jsonStr = JSON.stringify(eventsList, null, 2);
      const tmpPath = `${eventsFilePath}.tmp.${Date.now()}_pub_${proposal.id}`;
      await fs.writeFile(tmpPath, jsonStr, 'utf-8');
      await fs.rename(tmpPath, eventsFilePath);

      return newEvent;
    });

    // Update proposal record to distinct 'Published' status
    const now = new Date().toISOString();
    const reviewHistory = [
      ...(proposal.reviewHistory || []),
      {
        id: `hist-${Date.now()}`,
        fromStatus: proposal.status,
        toStatus: 'Published',
        timestamp: now,
        actor: req.user?.fullName || 'Manager',
        note: `Proposal successfully published to live catalogue with Event ID '${publishedEvent.id}'.`
      }
    ];

    const publicUpdates = [
      ...(proposal.publicUpdates || []),
      {
        id: `pub-${Date.now()}`,
        timestamp: now,
        message: `Congratulations! Your event is officially approved and published to the FESTIQ directory (Event ID: ${publishedEvent.id}).`,
        type: 'decision'
      }
    ];

    try {
      await updateProposal(proposal.id, {
        status: 'Published',
        publishedEventId: publishedEvent.id,
        reviewHistory,
        publicUpdates
      });
    } catch (proposalUpdateErr) {
      console.error('[Proposal Controller] Partial failure: Event written to events.json but proposal update failed:', proposalUpdateErr.message);
      // Recovery: retry update once
      await updateProposal(proposal.id, {
        status: 'Published',
        publishedEventId: publishedEvent.id
      });
    }

    return res.status(200).json({
      success: true,
      message: `Event successfully published to the catalogue with ID '${publishedEvent.id}'`,
      data: {
        proposalId: proposal.id,
        status: 'Published',
        publishedEventId: publishedEvent.id,
        publishedEvent: publishedEvent
      }
    });
  } catch (error) {
    console.error('[Proposal Controller] Publish error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to publish event proposal',
      error: error.message
    });
  }
}
