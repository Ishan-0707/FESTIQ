import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Download,
  Copy,
  ExternalLink,
  Calendar,
  Award,
  Sparkles,
  Building,
  Hash
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import FestiqLogo from '../components/common/FestiqLogo';
import { useToast } from '../context/ToastContext';
import { verifyCertificate, downloadCertificatePdf } from '../services/api';
import './VerifyCertificatePage.css';

export default function VerifyCertificatePage() {
  const { certificateId: routeCertId } = useParams();
  const [searchId, setSearchId] = useState(routeCertId || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const toast = useToast();

  const handleVerify = async (idToVerify) => {
    const cleanId = String(idToVerify || '').trim().toUpperCase();
    if (!cleanId) {
      toast.warning('Please enter a valid Certificate ID to verify');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setResult(null);

    try {
      const response = await verifyCertificate(cleanId);
      if (response && response.success) {
        setResult(response.data);
      } else {
        setResult({
          verificationResult: 'NOT_FOUND',
          isValid: false,
          message: response?.message || 'Certificate record not found'
        });
      }
    } catch (error) {
      setResult({
        verificationResult: 'NOT_FOUND',
        isValid: false,
        message: error.message || 'Unable to connect to verification authority'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeCertId) {
      setSearchId(routeCertId);
      handleVerify(routeCertId);
    }
  }, [routeCertId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleVerify(searchId);
  };

  const copyVerificationLink = (certId) => {
    const url = `${window.location.origin}/verify-certificate/${certId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Public verification link copied to clipboard!');
    }).catch(() => {
      toast.info(`Link: ${url}`);
    });
  };

  const copyCertificateId = (certId) => {
    navigator.clipboard.writeText(certId).then(() => {
      toast.success(`Copied Certificate ID: ${certId}`);
    });
  };

  return (
    <div className="verify-cert-page page-entrance">
      <div className="container">
        {/* Verification Hero Header */}
        <div className="verify-header">
          <div className="verify-badge">
            <FestiqLogo variant="symbol" size={20} />
            <span>FESTIQ Public Trust & Credential Verification</span>
          </div>
          <h1 className="verify-title">Official Certificate Verification</h1>
          <p className="verify-subtitle">
            Validate the authenticity, integrity, and issuance status of official FESTIQ participation and merit certificates issued by campus event convenors.
          </p>

          {/* Verification Search Bar */}
          <form className="verify-search-form" onSubmit={handleSubmit}>
            <div className="verify-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="verify-input"
                placeholder="Enter Certificate ID (e.g., CERT-2026-A1B2C3D4E5F6)..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                autoFocus={!routeCertId}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading || !searchId.trim()}
              className="verify-submit-btn"
            >
              {loading ? 'Verifying...' : 'Verify Authenticity'}
            </Button>
          </form>
        </div>

        {/* Verification Results Container */}
        <div className="verify-results-container">
          {loading && (
            <div className="verify-loading-card">
              <div className="verify-spinner" />
              <h3>Validating Cryptographic Record...</h3>
              <p>Checking university credential database and SHA-256 seal integrity.</p>
            </div>
          )}

          {!loading && hasSearched && result && (
            <div className="verify-result-wrapper">
              {/* STATE 1: VALID */}
              {result.verificationResult === 'VALID' && (
                <div className="verify-card cert-valid">
                  <div className="cert-card-header">
                    <div className="cert-status-pill status-valid">
                      <CheckCircle2 size={18} />
                      <span>Officially Verified & Authentic</span>
                    </div>
                    <span className="cert-hash-seal">
                      <Sparkles size={14} />
                      <span>Cryptographic Seal Verified</span>
                    </span>
                  </div>

                  <div className="cert-recipient-banner">
                    <span className="cert-subheading">This certifies that</span>
                    <h2 className="cert-recipient-name">{result.recipientName}</h2>
                    <p className="cert-attribution">
                      has successfully participated in and satisfied all venue requirements for
                    </p>
                    <h3 className="cert-event-name">{result.eventName}</h3>
                  </div>

                  <div className="cert-details-grid">
                    <div className="cert-detail-item">
                      <span className="detail-label">
                        <Calendar size={14} /> Event Date
                      </span>
                      <span className="detail-value">{result.eventDate || 'Campus Fest 2026'}</span>
                    </div>

                    <div className="cert-detail-item">
                      <span className="detail-label">
                        <Award size={14} /> Date of Issue
                      </span>
                      <span className="detail-value">
                        {new Date(result.issueDate).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="cert-detail-item">
                      <span className="detail-label">
                        <Building size={14} /> Issuing Authority
                      </span>
                      <span className="detail-value">{result.issuingAuthority}</span>
                    </div>

                    <div className="cert-detail-item">
                      <span className="detail-label">
                        <Hash size={14} /> Certificate ID
                      </span>
                      <span className="detail-value mono-id">
                        {result.certificateId}
                        <button
                          type="button"
                          className="copy-mini-btn"
                          onClick={() => copyCertificateId(result.certificateId)}
                          title="Copy ID"
                        >
                          <Copy size={13} />
                        </button>
                      </span>
                    </div>
                  </div>

                  <div className="cert-actions-row">
                    <Button
                      variant="primary"
                      size="md"
                      icon={<Download size={16} />}
                      onClick={() => downloadCertificatePdf(result.certificateId)}
                    >
                      Download Official PDF
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      icon={<Copy size={16} />}
                      onClick={() => copyVerificationLink(result.certificateId)}
                    >
                      Copy Verification Link
                    </Button>
                  </div>

                  <div className="cert-footer-notice">
                    <ShieldCheck size={16} />
                    <span>
                      Tamper-evident record maintained on the FESTIQ registry. Cryptographically validated with keyed HMAC-SHA-256 seal.
                    </span>
                  </div>
                </div>
              )}

              {/* STATE 2: REVOKED */}
              {result.verificationResult === 'REVOKED' && (
                <div className="verify-card cert-revoked">
                  <div className="cert-card-header">
                    <div className="cert-status-pill status-revoked">
                      <AlertTriangle size={18} />
                      <span>Certificate Revoked</span>
                    </div>
                    <span className="cert-id-tag mono-id">{result.certificateId}</span>
                  </div>

                  <div className="revoked-banner">
                    <XCircle size={44} className="revoked-icon" />
                    <h2>This Certificate is No Longer Valid</h2>
                    <p className="revoked-notice">
                      The university convenors have formally revoked this credential. It cannot be used for academic credits, merit portfolios, or verification.
                    </p>
                  </div>

                  <div className="revocation-details-box">
                    <div className="revocation-entry">
                      <span className="revocation-label">Recipient:</span>
                      <span className="revocation-val">{result.recipientName}</span>
                    </div>
                    <div className="revocation-entry">
                      <span className="revocation-label">Event:</span>
                      <span className="revocation-val">{result.eventName}</span>
                    </div>
                    <div className="revocation-entry">
                      <span className="revocation-label">Revoked On:</span>
                      <span className="revocation-val">
                        {result.revokedAt ? new Date(result.revokedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Official Record'}
                      </span>
                    </div>
                    <div className="revocation-entry reason-entry">
                      <span className="revocation-label">Revocation Reason:</span>
                      <span className="revocation-val">{result.revocationReason || 'Administrative cancellation'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STATE 3: NOT FOUND */}
              {result.verificationResult === 'NOT_FOUND' && (
                <div className="verify-card cert-not-found">
                  <div className="cert-card-header">
                    <div className="cert-status-pill status-not-found">
                      <AlertTriangle size={18} />
                      <span>Record Not Found</span>
                    </div>
                  </div>

                  <div className="not-found-content">
                    <h3>No Verified Certificate Found</h3>
                    <p>
                      {result.message ||
                        `No active university certificate matching '${searchId}' was found in the official credentials registry.`}
                    </p>
                    <ul className="not-found-checklist">
                      <li>Check that the Certificate ID was entered correctly with the <code>CERT-2026-</code> prefix.</li>
                      <li>Confirm that event convenors have officially published the certificates for this event.</li>
                      <li>Unpublished drafts or cancelled registrations will not resolve publicly.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {!hasSearched && (
            <div className="verify-placeholder-box">
              <div className="placeholder-icon-ring">
                <ShieldCheck size={36} />
              </div>
              <h3>Instant Credential Verification</h3>
              <p>
                Enter any FESTIQ Certificate ID above to verify recipient details, date of issue, issuing authority, and cryptographic authenticity.
              </p>
              <div className="sample-id-chips">
                <span>Format: <code>CERT-2026-XXXXXXXXXXXX</code></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
