import React, { useState } from 'react';
import {
  X,
  Ticket,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import Button from '../ui/Button';
import { claimGuestPass } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import './ClaimPassModal.css';

export default function ClaimPassModal({
  isOpen,
  onClose,
  onPassClaimed
}) {
  useScrollLock(isOpen);
  const [passId, setPassId] = useState('');
  const [passToken, setPassToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const toast = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passId.trim() || !passToken.trim()) {
      setError('Please provide both the Pass ID and Secret Pass Token.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await claimGuestPass({
        passId: passId.trim(),
        passToken: passToken.trim()
      });

      if (res.success) {
        const msg = res.message || 'Pass successfully linked to your student account!';
        setSuccess(msg);
        toast.success(msg);
        setPassId('');
        setPassToken('');
        if (onPassClaimed) {
          onPassClaimed(res.data);
        }
      } else {
        const errMsg = res.error || 'Failed to claim pass';
        setError(errMsg);
        toast.error(errMsg);
      }
    } catch (err) {
      const errMsg = err.message || 'Invalid Pass ID or Secret Token';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="claim-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="claim-modal-card modal-card-entrance" onClick={(e) => e.stopPropagation()}>
        <div className="claim-modal-header">
          <div className="claim-header-title">
            <Ticket size={20} className="claim-icon" />
            <h3>Link Previous Event Pass</h3>
          </div>
          <button
            type="button"
            className="claim-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <p className="claim-modal-desc">
          Registered before logging in? Enter your Pass ID and Secret Pass Token below to bind the ticket permanently to your student account.
        </p>

        {success && (
          <div className="claim-alert alert-success">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="claim-alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="claim-form">
          <div className="claim-form-group">
            <label htmlFor="claimPassId">Pass Identifier or Registration ID</label>
            <input
              type="text"
              id="claimPassId"
              placeholder="e.g. PASS-2026-A1B2 or FST-123456"
              value={passId}
              onChange={(e) => setPassId(e.target.value)}
              required
            />
          </div>

          <div className="claim-form-group">
            <label htmlFor="claimPassToken">Secret Pass Token</label>
            <input
              type="text"
              id="claimPassToken"
              placeholder="Enter 32-character hex pass token"
              value={passToken}
              onChange={(e) => setPassToken(e.target.value)}
              required
            />
          </div>

          <div className="claim-actions">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
              icon={<ArrowRight size={16} />}
            >
              {loading ? 'Verifying...' : 'Link Pass to Account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
