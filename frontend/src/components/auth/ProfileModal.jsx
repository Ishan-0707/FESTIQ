import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  GraduationCap,
  BookOpen,
  Building2,
  Phone,
  Lock,
  Edit2,
  Check,
  AlertCircle,
  Calendar,
  ShieldCheck
} from 'lucide-react';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import './ProfileModal.css';

export default function ProfileModal({ isOpen, onClose }) {
  useScrollLock(isOpen);
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    academicYear: '',
    programme: '',
    branch: '',
    school: '',
    phoneNumber: ''
  });

  // Sync form data whenever user object changes or modal opens
  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        fullName: user.fullName || '',
        academicYear: user.academicYear || '1st Year',
        programme: user.programme || 'B.Tech',
        branch: user.branch || '',
        school: user.school || 'School of Computer Engineering',
        phoneNumber: user.phoneNumber || ''
      });
      setIsEditing(false);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [user, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const getInitials = (name) => {
    if (!name) return 'KI';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formData.fullName.trim()) {
      setErrorMessage('Full name cannot be left blank');
      return;
    }

    const cleanPhone = formData.phoneNumber.replace(/[^0-9]/g, '');
    if (formData.phoneNumber && cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit phone number');
      return;
    }

    setSaving(true);
    try {
      const res = await updateProfile({
        fullName: formData.fullName.trim(),
        academicYear: formData.academicYear,
        programme: formData.programme,
        branch: formData.branch.trim(),
        school: formData.school.trim(),
        phoneNumber: cleanPhone
      });

      if (res.success) {
        const msg = 'Student profile updated successfully!';
        setSuccessMessage(msg);
        toast.success(msg);
        setIsEditing(false);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const msg = res.error || 'Failed to update profile';
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.message || 'Network error updating profile';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Active Student';

  return (
    <div className="profile-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="profile-modal-header">
          <div className="profile-title-wrap">
            <h2 className="profile-modal-title">Student Profile</h2>
            <span className="profile-modal-subtitle">KIIT Institutional Identity</span>
          </div>
          <button
            type="button"
            className="profile-modal-close"
            onClick={onClose}
            aria-label="Close profile modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile Card Banner */}
        <div className="profile-identity-banner">
          <div className="profile-avatar-circle">
            {getInitials(user.fullName)}
          </div>
          <div className="profile-identity-details">
            <h3 className="profile-student-name">{user.fullName}</h3>
            <div className="profile-identity-meta">
              <span className="profile-badge-roll">{user.email}</span>
              <span className="profile-badge-prog">{user.programme} • {user.branch}</span>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="profile-alert profile-alert-error">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="profile-alert profile-alert-success">
            <ShieldCheck size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Profile Body / Form */}
        <form onSubmit={handleSave} className="profile-form">
          <div className="profile-section-header">
            <span className="profile-section-title">Academic & Contact Details</span>
            {!isEditing ? (
              <button
                type="button"
                className="profile-edit-toggle-btn"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 size={14} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <span className="profile-editing-badge">Editing Mode</span>
            )}
          </div>

          <div className="profile-fields-grid">
            {/* Full Name */}
            <div className="profile-field-group">
              <label>Full Legal Name</label>
              <div className="profile-input-wrap">
                <User size={16} className="profile-field-icon" />
                <input
                  type="text"
                  value={formData.fullName}
                  disabled={!isEditing}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className={!isEditing ? 'readonly-input' : ''}
                />
              </div>
            </div>

            {/* Email (Strictly Immutable) */}
            <div className="profile-field-group">
              <div className="profile-label-with-badge">
                <label>Institutional Email</label>
                <span className="immutable-badge">
                  <Lock size={11} /> Immutable
                </span>
              </div>
              <div className="profile-input-wrap immutable-wrap">
                <Mail size={16} className="profile-field-icon" />
                <input
                  type="email"
                  value={user.email}
                  disabled
                  readOnly
                  className="readonly-input locked-input"
                  title="Institutional email address is permanent and cannot be modified."
                />
              </div>
              <span className="profile-field-hint">Tied to your official KIIT academic registration</span>
            </div>

            {/* Academic Year & Programme */}
            <div className="profile-field-group">
              <label>Academic Year</label>
              <div className="profile-input-wrap">
                <GraduationCap size={16} className="profile-field-icon" />
                {isEditing ? (
                  <select
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={user.academicYear}
                    disabled
                    readOnly
                    className="readonly-input"
                  />
                )}
              </div>
            </div>

            <div className="profile-field-group">
              <label>Programme</label>
              <div className="profile-input-wrap">
                <BookOpen size={16} className="profile-field-icon" />
                {isEditing ? (
                  <select
                    value={formData.programme}
                    onChange={(e) => setFormData({ ...formData, programme: e.target.value })}
                  >
                    <option value="B.Tech">B.Tech</option>
                    <option value="M.Tech">M.Tech</option>
                    <option value="BCA">BCA</option>
                    <option value="MCA">MCA</option>
                    <option value="BBA">BBA</option>
                    <option value="MBA">MBA</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={user.programme}
                    disabled
                    readOnly
                    className="readonly-input"
                  />
                )}
              </div>
            </div>

            {/* Branch */}
            <div className="profile-field-group profile-col-span">
              <label>Branch / Department</label>
              <input
                type="text"
                value={formData.branch}
                disabled={!isEditing}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className={!isEditing ? 'readonly-input' : ''}
              />
            </div>

            {/* School */}
            <div className="profile-field-group profile-col-span">
              <label>School / Faculty</label>
              <div className="profile-input-wrap">
                <Building2 size={16} className="profile-field-icon" />
                {isEditing ? (
                  <select
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                  >
                    <option value="School of Computer Engineering">School of Computer Engineering</option>
                    <option value="School of Electronics Engineering">School of Electronics Engineering</option>
                    <option value="School of Mechanical Engineering">School of Mechanical Engineering</option>
                    <option value="School of Electrical Engineering">School of Electrical Engineering</option>
                    <option value="School of Civil Engineering">School of Civil Engineering</option>
                    <option value="School of Biotechnology">School of Biotechnology</option>
                    <option value="School of Management">School of Management</option>
                    <option value="School of Applied Sciences">School of Applied Sciences</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={user.school || 'School of Computer Engineering'}
                    disabled
                    readOnly
                    className="readonly-input"
                  />
                )}
              </div>
            </div>

            {/* Phone Number */}
            <div className="profile-field-group">
              <label>Contact Phone</label>
              <div className="profile-input-wrap">
                <Phone size={16} className="profile-field-icon" />
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  disabled={!isEditing}
                  placeholder="10-digit number"
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className={!isEditing ? 'readonly-input' : ''}
                />
              </div>
            </div>

            {/* Registration Date */}
            <div className="profile-field-group">
              <label>Member Since</label>
              <div className="profile-input-wrap">
                <Calendar size={16} className="profile-field-icon" />
                <input
                  type="text"
                  value={formattedDate}
                  disabled
                  readOnly
                  className="readonly-input"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="profile-modal-footer">
            {isEditing ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      fullName: user.fullName || '',
                      academicYear: user.academicYear || '1st Year',
                      programme: user.programme || 'B.Tech',
                      branch: user.branch || '',
                      school: user.school || 'School of Computer Engineering',
                      phoneNumber: user.phoneNumber || ''
                    });
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  icon={<Check size={14} />}
                  iconPosition="left"
                  disabled={saving}
                >
                  {saving ? 'Saving Changes...' : 'Save Profile Changes'}
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={onClose}
              >
                Close
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

