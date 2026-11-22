import express from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, requireManager } from '../middleware/authMiddleware.js';
import {
  CERTIFICATE_STATUS,
  computeCertificateHmac,
  getAllCertificates,
  getCertificateById,
  getCertificatesByUserId,
  getEventAttendeesEligibility,
  grantEligibilityOverride,
  issueCertificate,
  publishCertificate,
  revokeCertificate,
  verifyCertificatePublic
} from '../utils/certificateStorage.js';
import { generateCertificatePdfStream } from '../services/certificatePdfGenerator.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'festiq_jwt_secret_dev_key_2026_kiit_secure';

/**
 * GET /api/certificates/my-certificates
 * Student Endpoint: Retrieves all certificates belonging to the authenticated student.
 */
router.get('/my-certificates', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;
    const certificates = await getCertificatesByUserId(userId, email);

    // Return certificates sorted newest first
    certificates.sort((a, b) => new Date(b.issueDate || b.createdAt) - new Date(a.issueDate || a.createdAt));

    res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates
    });
  } catch (error) {
    console.error('[Certificate Routes] Error fetching student certificates:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve certificates',
      error: error.message
    });
  }
});

/**
 * GET /api/certificates/verify/:id
 * Public Endpoint: Verifies authenticity of a certificate.
 * Returns VALID, REVOKED, or NOT_FOUND without disclosing sensitive PII.
 */
router.get('/verify/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const verification = await verifyCertificatePublic(id);
    res.status(200).json({
      success: true,
      data: verification
    });
  } catch (error) {
    console.error('[Certificate Routes] Public verification error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Certificate verification service error',
      error: error.message
    });
  }
});

/**
 * GET /api/certificates/:id/download
 * Downloads official PDF certificate.
 * - Integrity: Verified via keyed HMAC-SHA-256 before generation.
 * - Revoked certificates: Blocked from download as valid credentials (400).
 * - Draft certificates: Blocked for students and public users (403).
 * - Authorization: When requested by an authenticated student, strictly checks that the certificate belongs to them.
 */
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const cert = await getCertificateById(id);

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: `Certificate with ID '${id}' was not found`
      });
    }

    // 1. Cryptographic HMAC Integrity Verification before PDF generation
    const expectedHmac = computeCertificateHmac(cert);
    if (!cert.integrityHash || cert.integrityHash !== expectedHmac) {
      return res.status(400).json({
        success: false,
        message: 'Certificate data integrity verification failed'
      });
    }

    // 2. Revoked certificates cannot be downloaded as valid credentials
    if (cert.status === CERTIFICATE_STATUS.REVOKED) {
      return res.status(400).json({
        success: false,
        message: 'Revoked certificates cannot be downloaded as valid credentials'
      });
    }

    // 3. Draft certificates cannot be downloaded by students or public users
    if (cert.status === CERTIFICATE_STATUS.DRAFT) {
      return res.status(403).json({
        success: false,
        message: 'Draft certificates cannot be downloaded by students or public users'
      });
    }

    // 4. Student ownership check: Authenticated students can only download their own certificates
    const token = req.cookies ? req.cookies.festiq_session : null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.role === 'student') {
          if (cert.userId && cert.userId !== decoded.id) {
            return res.status(403).json({
              success: false,
              message: 'Access denied: Students cannot download another student’s certificate'
            });
          }
        }
      } catch {}
    }

    // Set PDF download headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="FESTIQ-Certificate-${cert.id}.pdf"`
    );

    const pdfStream = generateCertificatePdfStream(cert);
    pdfStream.pipe(res);
  } catch (error) {
    console.error('[Certificate Routes] Error generating PDF download:', error.message);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate certificate PDF document',
        error: error.message
      });
    }
  }
});

/**
 * GET /api/certificates/manage/event/:eventId
 * Manager Endpoint: Retrieves attendee eligibility roster and metrics for an event.
 */
router.get('/manage/event/:eventId', requireAuth, requireManager, async (req, res) => {
  try {
    const { eventId } = req.params;
    const roster = await getEventAttendeesEligibility(eventId);
    res.status(200).json({
      success: true,
      data: roster
    });
  } catch (error) {
    console.error('[Certificate Routes] Error fetching event eligibility:', error.message);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve event eligibility'
    });
  }
});

/**
 * POST /api/certificates/manage/override
 * Manager Endpoint: Grants an eligibility override for an attendee.
 */
router.post('/manage/override', requireAuth, requireManager, async (req, res) => {
  try {
    const { eventId, userId, registrationId, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A detailed reason for the eligibility override is required.'
      });
    }

    const override = await grantEligibilityOverride({
      eventId,
      userId,
      registrationId,
      reason,
      managerId: req.user.id,
      managerName: req.user.fullName || req.user.name || 'Event Manager',
      managerEmail: req.user.email
    });

    res.status(200).json({
      success: true,
      message: 'Management eligibility override granted successfully',
      data: override
    });
  } catch (error) {
    console.error('[Certificate Routes] Error granting override:', error.message);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to grant eligibility override'
    });
  }
});

/**
 * POST /api/certificates/manage/issue
 * Manager Endpoint: Issues a certificate for an attendee (validated against attendance or override).
 * Strictly creates certificate in DRAFT status. Any autoPublish flag is rejected/ignored.
 */
router.post('/manage/issue', requireAuth, requireManager, async (req, res) => {
  try {
    const { eventId, userId, registrationId } = req.body;

    const result = await issueCertificate({
      eventId,
      userId,
      registrationId,
      managerName: req.user.fullName || req.user.name || 'Event Manager'
    });

    res.status(200).json({
      success: true,
      message: result.alreadyIssued
        ? 'Certificate already issued for this attendee'
        : 'Certificate successfully issued in draft status',
      ...result
    });
  } catch (error) {
    console.error('[Certificate Routes] Error issuing certificate:', error.message);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to issue certificate',
      ineligible: Boolean(error.ineligible)
    });
  }
});

/**
 * POST /api/certificates/manage/publish
 * Manager Endpoint: Publishes a draft certificate for public verification and download.
 * Revalidates attendance/override and registration status.
 */
router.post('/manage/publish', requireAuth, requireManager, async (req, res) => {
  try {
    const { certificateId } = req.body;

    const result = await publishCertificate({
      certificateId,
      managerName: req.user.fullName || req.user.name || 'Event Manager'
    });

    res.status(200).json({
      success: true,
      message: result.alreadyPublished
        ? 'Certificate is already published'
        : 'Certificate officially published and active',
      ...result
    });
  } catch (error) {
    console.error('[Certificate Routes] Error publishing certificate:', error.message);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to publish certificate'
    });
  }
});

/**
 * POST /api/certificates/manage/revoke
 * Manager Endpoint: Revokes an issued certificate with audit details.
 */
router.post('/manage/revoke', requireAuth, requireManager, async (req, res) => {
  try {
    const { certificateId, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A clear revocation reason is required.'
      });
    }

    const result = await revokeCertificate({
      certificateId,
      reason,
      managerName: req.user.fullName || req.user.name || 'Event Manager',
      managerEmail: req.user.email
    });

    res.status(200).json({
      success: true,
      message: result.alreadyRevoked
        ? 'Certificate was already revoked'
        : 'Certificate successfully revoked',
      ...result
    });
  } catch (error) {
    console.error('[Certificate Routes] Error revoking certificate:', error.message);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to revoke certificate'
    });
  }
});

/**
 * POST /api/certificates/manage/batch-issue
 * Manager Endpoint: Batch issues certificates for multiple attendee registrations in DRAFT status.
 */
router.post('/manage/batch-issue', requireAuth, requireManager, async (req, res) => {
  try {
    const { eventId, registrationIds } = req.body;

    if (!eventId || !Array.isArray(registrationIds) || registrationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'eventId and non-empty registrationIds array are required'
      });
    }

    const managerName = req.user.fullName || req.user.name || 'Event Manager';
    const succeeded = [];
    const alreadyIssued = [];
    const failed = [];

    for (const regId of registrationIds) {
      try {
        const result = await issueCertificate({
          eventId,
          registrationId: regId,
          managerName
        });

        if (result.alreadyIssued) {
          alreadyIssued.push(result.certificate);
        } else {
          succeeded.push(result.certificate);
        }
      } catch (err) {
        failed.push({
          registrationId: regId,
          error: err.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Batch issuance complete: ${succeeded.length} issued in draft status, ${alreadyIssued.length} already existed, ${failed.length} failed.`,
      summary: {
        totalRequested: registrationIds.length,
        issuedCount: succeeded.length,
        alreadyIssuedCount: alreadyIssued.length,
        failedCount: failed.length
      },
      succeeded,
      alreadyIssued,
      failed
    });
  } catch (error) {
    console.error('[Certificate Routes] Batch issue error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Batch certificate issuance failed',
      error: error.message
    });
  }
});

/**
 * POST /api/certificates/manage/batch-publish
 * Manager Endpoint: Batch publishes certificates.
 */
router.post('/manage/batch-publish', requireAuth, requireManager, async (req, res) => {
  try {
    const { certificateIds } = req.body;

    if (!Array.isArray(certificateIds) || certificateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'certificateIds array is required'
      });
    }

    const managerName = req.user.fullName || req.user.name || 'Event Manager';
    const succeeded = [];
    const alreadyPublished = [];
    const failed = [];

    for (const certId of certificateIds) {
      try {
        const result = await publishCertificate({
          certificateId: certId,
          managerName
        });

        if (result.alreadyPublished) {
          alreadyPublished.push(result.certificate);
        } else {
          succeeded.push(result.certificate);
        }
      } catch (err) {
        failed.push({
          certificateId: certId,
          error: err.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Batch publication complete: ${succeeded.length} published, ${alreadyPublished.length} already published, ${failed.length} failed.`,
      summary: {
        totalRequested: certificateIds.length,
        publishedCount: succeeded.length,
        alreadyPublishedCount: alreadyPublished.length,
        failedCount: failed.length
      },
      succeeded,
      alreadyPublished,
      failed
    });
  } catch (error) {
    console.error('[Certificate Routes] Batch publish error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Batch certificate publication failed',
      error: error.message
    });
  }
});

export default router;
