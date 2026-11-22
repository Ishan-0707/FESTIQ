import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { withCapacityLock } from './capacityLock.js';
import { getAllRegistrations, getEventDetails } from './registrationStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const certificatesFilePath = path.join(__dirname, '..', 'data', 'certificates.json');
const overridesFilePath = path.join(__dirname, '..', 'data', 'certificateOverrides.json');
const usersFilePath = path.join(__dirname, '..', 'data', 'users.json');

// Certificate status constants
export const CERTIFICATE_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  REVOKED: 'REVOKED'
};

// Eligibility sources
export const ELIGIBILITY_SOURCE = {
  ATTENDANCE: 'attendance',
  OVERRIDE: 'override'
};

export const DEFAULT_ISSUING_AUTHORITY = 'Issued by FESTIQ · Campus Event Ecosystem';

/**
 * Retrieves the cryptographic HMAC secret from environment.
 * In production (NODE_ENV === 'production'), throws a fatal error if missing.
 * In development / local testing, uses a documented local key with console notice.
 */
function getHmacSecret() {
  const secret = process.env.CERTIFICATE_HMAC_SECRET;
  if (!secret || !secret.trim()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[Security Error] CERTIFICATE_HMAC_SECRET environment variable is required in production');
    }
    return 'festiq_cert_hmac_secret_dev_2026_local_fallback';
  }
  return secret.trim();
}

/**
 * Computes a keyed HMAC-SHA-256 cryptographic signature across core certificate properties.
 * Protects certificate data integrity against unauthorized file modification or parameter tampering.
 */
export function computeCertificateHmac(cert) {
  const secret = getHmacSecret();
  const payload = [
    cert.id || '',
    cert.eventId || '',
    cert.userId || cert.registrationId || '',
    cert.recipientName || '',
    cert.eventName || '',
    cert.eventDate || '',
    cert.issueDate || '',
    cert.eligibilitySource || '',
    cert.status || ''
  ].join('|');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// Backward-compatible alias
export const computeCertificateHash = computeCertificateHmac;

/**
 * Resolves the canonical public verification URL from configured environment variables.
 * Falls back to local dev URL (http://localhost:5173).
 */
export function getCanonicalVerificationUrl(certificateId) {
  const base = process.env.APP_BASE_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const cleanBase = base.replace(/\/+$/, '');
  return `${cleanBase}/verify-certificate/${encodeURIComponent(certificateId)}`;
}

/**
 * Read all certificates from persistent storage.
 */
export async function getAllCertificates() {
  try {
    const raw = await fs.readFile(certificatesFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(certificatesFilePath, '[]', 'utf-8');
      return [];
    }
    console.error('[Certificate Storage] Error reading certificates.json:', error.message);
    throw new Error('Could not access certificates storage');
  }
}

/**
 * Atomically persist certificates via temporary file and rename.
 */
async function saveCertificates(entries) {
  const jsonString = JSON.stringify(entries, null, 2);
  const tmpPath = `${certificatesFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    await fs.writeFile(tmpPath, jsonString, 'utf-8');
    await fs.rename(tmpPath, certificatesFilePath);
  } catch (err) {
    try { await fs.unlink(tmpPath); } catch {}
    throw new Error('Failed to persist certificate records atomically');
  }
}

/**
 * Read all certificate overrides from persistent storage.
 */
export async function getAllOverrides() {
  try {
    const raw = await fs.readFile(overridesFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(overridesFilePath, '[]', 'utf-8');
      return [];
    }
    console.error('[Certificate Storage] Error reading certificateOverrides.json:', error.message);
    throw new Error('Could not access certificate overrides storage');
  }
}

/**
 * Atomically persist certificate overrides via temporary file and rename.
 */
async function saveOverrides(entries) {
  const jsonString = JSON.stringify(entries, null, 2);
  const tmpPath = `${overridesFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    await fs.writeFile(tmpPath, jsonString, 'utf-8');
    await fs.rename(tmpPath, overridesFilePath);
  } catch (err) {
    try { await fs.unlink(tmpPath); } catch {}
    throw new Error('Failed to persist certificate override records atomically');
  }
}

/**
 * Helper to retrieve user profile map for name resolution.
 */
async function readUsersMap() {
  try {
    const raw = await fs.readFile(usersFilePath, 'utf-8');
    const users = JSON.parse(raw);
    return new Map(Array.isArray(users) ? users.map((u) => [u.id, u]) : []);
  } catch {
    return new Map();
  }
}

/**
 * Retrieve a certificate by unique cryptographically secure ID.
 */
export async function getCertificateById(certificateId) {
  if (!certificateId) return null;
  const cleanId = String(certificateId).trim().toUpperCase();
  const certificates = await getAllCertificates();
  return certificates.find((c) => c.id.toUpperCase() === cleanId) || null;
}

/**
 * Retrieve all certificates for a specific student (userId or email).
 * Matches by userId or registrationId via registrations store.
 * Eliminates duplicated PII from certificates.json.
 */
export async function getCertificatesByUserId(userId, email = null) {
  if (!userId && !email) return [];
  const certificates = await getAllCertificates();

  const userRegIds = new Set();
  try {
    const registrations = await getAllRegistrations();
    registrations.forEach((r) => {
      const matchU = userId && r.userId === userId;
      const matchE = email && r.email && r.email.toLowerCase() === email.toLowerCase();
      if (matchU || matchE) {
        userRegIds.add(r.id);
      }
    });
  } catch {}

  return certificates.filter((c) => {
    const matchUser = userId && c.userId === userId;
    const matchReg = userRegIds.has(c.registrationId);
    return matchUser || matchReg;
  });
}

/**
 * Manager Query: Evaluates event attendee eligibility and certificate issuance status.
 */
export async function getEventAttendeesEligibility(eventId) {
  if (!eventId) throw new Error('eventId is required');

  const event = await getEventDetails(eventId);
  if (!event) {
    const err = new Error(`Event with ID '${eventId}' was not found`);
    err.statusCode = 404;
    throw err;
  }

  const registrations = await getAllRegistrations();
  const eventRegistrations = registrations.filter(
    (r) => r.eventId === eventId && r.status !== 'cancelled'
  );

  const overrides = await getAllOverrides();
  const eventOverrides = overrides.filter((o) => o.eventId === eventId);
  const overrideMap = new Map(
    eventOverrides.map((o) => [o.userId || o.registrationId, o])
  );

  const certificates = await getAllCertificates();
  const eventCertificates = certificates.filter((c) => c.eventId === eventId);
  const certMap = new Map(
    eventCertificates.map((c) => [c.userId || c.registrationId, c])
  );

  const attendees = eventRegistrations.map((reg) => {
    const pass = reg.pass || {};
    const checkedIn = Boolean(reg.checkedIn || pass.checkedIn);
    const checkedInAt = reg.checkedInAt || pass.checkedInAt || null;
    const checkedInBy = reg.checkedInBy || pass.checkedInBy || null;

    const override = overrideMap.get(reg.userId) || overrideMap.get(reg.id) || null;
    const cert = certMap.get(reg.userId) || certMap.get(reg.id) || null;

    let eligibilityStatus = 'INELIGIBLE';
    let eligibilityReason = 'Pending verified venue attendance or manager authorization';

    if (checkedIn) {
      eligibilityStatus = 'ELIGIBLE_ATTENDANCE';
      eligibilityReason = 'Verified attendance via QR pass scan';
    } else if (override) {
      eligibilityStatus = 'ELIGIBLE_OVERRIDE';
      eligibilityReason = `Management override granted by ${override.managerName}: ${override.reason}`;
    }

    return {
      registrationId: reg.id,
      userId: reg.userId || null,
      participantName: reg.participantName,
      email: reg.email,
      phone: reg.phone,
      rollNumber: reg.rollNumber,
      checkedIn,
      checkedInAt,
      checkedInBy,
      eligibilityStatus,
      eligibilityReason,
      isEligible: checkedIn || Boolean(override),
      override: override
        ? {
            id: override.id,
            reason: override.reason,
            managerName: override.managerName,
            managerEmail: override.managerEmail,
            grantedAt: override.createdAt
          }
        : null,
      certificate: cert
        ? {
            id: cert.id,
            status: cert.status,
            issueDate: cert.issueDate,
            publishedAt: cert.publishedAt,
            revokedAt: cert.revokedAt,
            revocationReason: cert.revocationReason
          }
        : null
    };
  });

  const totalRegistered = attendees.length;
  const verifiedAttendance = attendees.filter((a) => a.checkedIn).length;
  const overridesCount = attendees.filter((a) => !a.checkedIn && a.override).length;
  const eligibleTotal = attendees.filter((a) => a.isEligible).length;
  const issuedTotal = attendees.filter((a) => a.certificate).length;
  const publishedTotal = attendees.filter((a) => a.certificate?.status === CERTIFICATE_STATUS.PUBLISHED).length;
  const revokedTotal = attendees.filter((a) => a.certificate?.status === CERTIFICATE_STATUS.REVOKED).length;

  return {
    event: {
      id: event.id,
      title: event.title,
      category: event.category,
      date: event.date,
      venue: event.venue
    },
    metrics: {
      totalRegistered,
      verifiedAttendance,
      overridesCount,
      eligibleTotal,
      issuedTotal,
      publishedTotal,
      revokedTotal
    },
    attendees
  };
}

/**
 * Grant management override for a student who could not scan their QR code.
 * Strict manager authorization required.
 */
export async function grantEligibilityOverride({
  eventId,
  userId = null,
  registrationId,
  reason,
  managerId,
  managerName,
  managerEmail
}) {
  return withCapacityLock(async () => {
    if (!eventId || (!userId && !registrationId)) {
      const err = new Error('eventId and either userId or registrationId are required');
      err.statusCode = 400;
      throw err;
    }

    if (!reason || !reason.trim()) {
      const err = new Error('A detailed reason for the eligibility override is required');
      err.statusCode = 400;
      throw err;
    }

    const registrations = await getAllRegistrations();
    const reg = registrations.find(
      (r) => r.eventId === eventId && (r.id === registrationId || (userId && r.userId === userId))
    );

    if (!reg) {
      const err = new Error(`Confirmed registration for event '${eventId}' was not found`);
      err.statusCode = 404;
      throw err;
    }

    const overrides = await getAllOverrides();
    const existingIndex = overrides.findIndex(
      (o) => o.eventId === eventId && (o.registrationId === reg.id || (userId && o.userId === userId))
    );

    const now = new Date().toISOString();
    let overrideRecord;

    if (existingIndex !== -1) {
      overrideRecord = {
        ...overrides[existingIndex],
        reason: reason.trim(),
        managerId: managerId || overrides[existingIndex].managerId,
        managerName: managerName || overrides[existingIndex].managerName,
        managerEmail: managerEmail || overrides[existingIndex].managerEmail,
        updatedAt: now
      };
      overrides[existingIndex] = overrideRecord;
    } else {
      overrideRecord = {
        id: `OVR-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        eventId,
        registrationId: reg.id,
        userId: reg.userId || userId || null,
        participantName: reg.participantName,
        email: reg.email,
        reason: reason.trim(),
        managerId: managerId || null,
        managerName: managerName || 'Authorized Event Manager',
        managerEmail: managerEmail || null,
        createdAt: now,
        updatedAt: now
      };
      overrides.push(overrideRecord);
    }

    await saveOverrides(overrides);
    return overrideRecord;
  });
}

/**
 * Issue a Certificate for an eligible attendee.
 * Fully serialized, idempotent, and validated on the backend.
 * NOTE: Strict draft-only issuance. The autoPublish option has been removed.
 * Every certificate is created in DRAFT status and must be published via separate action.
 */
export async function issueCertificate({
  eventId,
  userId = null,
  registrationId = null,
  managerName = 'Manager'
}) {
  return withCapacityLock(async () => {
    if (!eventId || (!userId && !registrationId)) {
      const err = new Error('eventId and either userId or registrationId are required');
      err.statusCode = 400;
      throw err;
    }

    const event = await getEventDetails(eventId);
    if (!event) {
      const err = new Error(`Event '${eventId}' was not found`);
      err.statusCode = 404;
      throw err;
    }

    const registrations = await getAllRegistrations();
    const reg = registrations.find(
      (r) => r.eventId === eventId && r.status !== 'cancelled' &&
             (r.id === registrationId || (userId && r.userId === userId))
    );

    if (!reg) {
      const err = new Error(`Valid registration for event '${eventId}' was not found`);
      err.statusCode = 404;
      throw err;
    }

    const certificates = await getAllCertificates();

    // Idempotency check: unique logical constraint on (eventId, userId/registrationId)
    const existingCert = certificates.find(
      (c) => c.eventId === eventId &&
             (c.registrationId === reg.id || (userId && c.userId === userId) || (reg.userId && c.userId === reg.userId))
    );

    if (existingCert) {
      return {
        alreadyIssued: true,
        certificate: existingCert
      };
    }

    // Backend Eligibility Verification:
    // 1. Verified attendance (QR scan) OR
    // 2. Authorized management override
    const isCheckedIn = Boolean(reg.checkedIn || reg.pass?.checkedIn);
    const overrides = await getAllOverrides();
    const override = overrides.find(
      (o) => o.eventId === eventId && (o.registrationId === reg.id || (reg.userId && o.userId === reg.userId))
    );

    if (!isCheckedIn && !override) {
      const err = new Error(
        `Attendee '${reg.participantName}' is ineligible for a certificate. Requires verified venue check-in or an authorized management override.`
      );
      err.statusCode = 400;
      err.ineligible = true;
      throw err;
    }

    const eligibilitySource = isCheckedIn ? ELIGIBILITY_SOURCE.ATTENDANCE : ELIGIBILITY_SOURCE.OVERRIDE;
    const overrideDetails = override
      ? {
          overrideId: override.id,
          reason: override.reason,
          managerName: override.managerName,
          managerEmail: override.managerEmail,
          grantedAt: override.createdAt
        }
      : null;

    let recipientName = reg.participantName || 'Student Participant';
    const effectiveUserId = reg.userId || userId;
    if (effectiveUserId) {
      const userMap = await readUsersMap();
      const user = userMap.get(effectiveUserId);
      if (user && user.fullName) {
        recipientName = user.fullName;
      }
    }

    const now = new Date().toISOString();
    const certId = `CERT-2026-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    // Stored Certificate Model — Data Minimization:
    // Duplicated PII (email, phone, rollNumber) is excluded from persistent certificates.json.
    const newCertificate = {
      id: certId,
      eventId: event.id,
      eventName: event.title,
      eventDate: event.date || 'Campus Event 2026',
      userId: effectiveUserId || null,
      registrationId: reg.id,
      recipientName: recipientName.trim(),
      issueDate: now,
      issuingAuthority: DEFAULT_ISSUING_AUTHORITY,
      eligibilitySource,
      overrideDetails,
      status: CERTIFICATE_STATUS.DRAFT,
      publishedAt: null,
      publishedBy: null,
      revokedAt: null,
      revokedBy: null,
      revocationReason: null,
      createdAt: now,
      updatedAt: now
    };

    // Compute Keyed HMAC-SHA-256 integrity signature
    newCertificate.integrityHash = computeCertificateHmac(newCertificate);

    certificates.push(newCertificate);
    await saveCertificates(certificates);

    return {
      alreadyIssued: false,
      certificate: newCertificate
    };
  });
}

/**
 * Publish an issued draft certificate.
 * Validates eligibility and registration status again on the backend prior to publication.
 */
export async function publishCertificate({ certificateId, managerName = 'Manager' }) {
  return withCapacityLock(async () => {
    if (!certificateId) throw new Error('certificateId is required');

    const cleanId = String(certificateId).trim().toUpperCase();
    const certificates = await getAllCertificates();
    const certIndex = certificates.findIndex((c) => c.id.toUpperCase() === cleanId);

    if (certIndex === -1) {
      const err = new Error(`Certificate with ID '${certificateId}' was not found`);
      err.statusCode = 404;
      throw err;
    }

    const cert = certificates[certIndex];

    if (cert.status === CERTIFICATE_STATUS.REVOKED) {
      const err = new Error('Cannot publish a revoked certificate. Revoked certificates remain archived.');
      err.statusCode = 400;
      throw err;
    }

    if (cert.status === CERTIFICATE_STATUS.PUBLISHED) {
      return {
        alreadyPublished: true,
        certificate: cert
      };
    }

    // Backend re-validation of eligibility and registration status before publishing
    const registrations = await getAllRegistrations();
    const reg = registrations.find((r) => r.id === cert.registrationId && r.status !== 'cancelled');

    if (!reg) {
      const err = new Error('Associated registration has been cancelled or no longer exists. Cannot publish certificate.');
      err.statusCode = 400;
      throw err;
    }

    const isCheckedIn = Boolean(reg.checkedIn || reg.pass?.checkedIn);
    const overrides = await getAllOverrides();
    const hasOverride = overrides.some((o) => o.eventId === cert.eventId && (o.registrationId === reg.id || o.userId === reg.userId));

    if (!isCheckedIn && !hasOverride) {
      const err = new Error('Attendee is no longer eligible. Attendance or override validation failed.');
      err.statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();
    cert.status = CERTIFICATE_STATUS.PUBLISHED;
    cert.publishedAt = now;
    cert.publishedBy = managerName;
    cert.updatedAt = now;
    cert.integrityHash = computeCertificateHmac(cert);

    certificates[certIndex] = cert;
    await saveCertificates(certificates);

    return {
      alreadyPublished: false,
      certificate: cert
    };
  });
}

/**
 * Revoke a certificate.
 * Records the revoking manager, timestamp, and reason. Record is preserved for audit trail.
 */
export async function revokeCertificate({
  certificateId,
  reason,
  managerName = 'Manager',
  managerEmail = null
}) {
  return withCapacityLock(async () => {
    if (!certificateId) throw new Error('certificateId is required');

    if (!reason || !reason.trim()) {
      const err = new Error('A specific revocation reason is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanId = String(certificateId).trim().toUpperCase();
    const certificates = await getAllCertificates();
    const certIndex = certificates.findIndex((c) => c.id.toUpperCase() === cleanId);

    if (certIndex === -1) {
      const err = new Error(`Certificate with ID '${certificateId}' was not found`);
      err.statusCode = 404;
      throw err;
    }

    const cert = certificates[certIndex];

    if (cert.status === CERTIFICATE_STATUS.REVOKED) {
      return {
        alreadyRevoked: true,
        certificate: cert
      };
    }

    const now = new Date().toISOString();
    cert.status = CERTIFICATE_STATUS.REVOKED;
    cert.revokedAt = now;
    cert.revokedBy = managerName || managerEmail || 'Authorized Manager';
    cert.revocationReason = reason.trim();
    cert.updatedAt = now;
    cert.integrityHash = computeCertificateHmac(cert);

    certificates[certIndex] = cert;
    await saveCertificates(certificates);

    return {
      alreadyRevoked: false,
      certificate: cert
    };
  });
}

/**
 * Public Verification Endpoint helper:
 * Determines authenticity without exposing student PII or credentials.
 * Returns outcomes: VALID, REVOKED, or NOT_FOUND.
 */
export async function verifyCertificatePublic(certificateId) {
  if (!certificateId) {
    return {
      verificationResult: 'NOT_FOUND',
      isValid: false,
      message: 'Certificate ID is required for verification'
    };
  }

  const cert = await getCertificateById(certificateId);

  if (!cert) {
    return {
      verificationResult: 'NOT_FOUND',
      isValid: false,
      message: 'Certificate record not found in credentials database'
    };
  }

  // Unpublished draft certificates are not valid publicly
  if (cert.status === CERTIFICATE_STATUS.DRAFT) {
    return {
      verificationResult: 'NOT_FOUND',
      isValid: false,
      message: 'This certificate has not yet been officially published by event convenors'
    };
  }

  // Cryptographic Keyed HMAC Integrity Verification
  // Must be verified before determining validity or returning revoked details
  const expectedHmac = computeCertificateHmac(cert);
  if (!cert.integrityHash || cert.integrityHash !== expectedHmac) {
    return {
      verificationResult: 'NOT_FOUND',
      isValid: false,
      message: 'Certificate data integrity verification failed'
    };
  }

  // Revoked certificates (HMAC verified, marked permanently revoked)
  if (cert.status === CERTIFICATE_STATUS.REVOKED) {
    return {
      verificationResult: 'REVOKED',
      isValid: false,
      certificateId: cert.id,
      recipientName: cert.recipientName,
      eventName: cert.eventName,
      eventDate: cert.eventDate,
      issueDate: cert.issueDate,
      issuingAuthority: cert.issuingAuthority,
      revokedAt: cert.revokedAt,
      revocationReason: cert.revocationReason,
      status: cert.status
    };
  }

  // Valid published certificate
  return {
    verificationResult: 'VALID',
    isValid: true,
    certificateId: cert.id,
    recipientName: cert.recipientName,
    eventName: cert.eventName,
    eventDate: cert.eventDate,
    issueDate: cert.issueDate,
    issuingAuthority: cert.issuingAuthority,
    status: cert.status,
    eligibilitySource: cert.eligibilitySource,
    verificationUrl: getCanonicalVerificationUrl(cert.id)
  };
}
