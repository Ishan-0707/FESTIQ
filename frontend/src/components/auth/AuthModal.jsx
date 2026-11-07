import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, GraduationCap, BookOpen, ShieldCheck, AlertCircle, Building2, Phone, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import FestiqLogo from '../common/FestiqLogo';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import { requestForgotPassword, submitPasswordReset } from '../../services/api';
import './AuthModal.css';

const KIIT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@kiit\.ac\.in$/i;

export default function AuthModal({
  isOpen,
  onClose,
  initialTab = 'login'
}) {
  useScrollLock(isOpen);
  const { login, signup } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form states
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [signupForm, setSignupForm] = useState({
    fullName: '',
    email: '',
    academicYear: '3rd Year',
    programme: 'B.Tech',
    branch: 'Computer Science & Engineering',
    school: 'School of Computer Engineering',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });

  // Forgot password & Reset password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetForm, setResetForm] = useState({
    token: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [devTokenNotice, setDevTokenNotice] = useState(null);

  // Sync initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMessage(null);
      setSuccessMessage(null);
      setDevTokenNotice(null);
    }
  }, [isOpen, initialTab]);

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

  if (!isOpen) return null;

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailTrimmed = loginForm.email.trim();
    if (!emailTrimmed) {
      setErrorMessage('Please enter your institutional email');
      return;
    }

    if (!KIIT_EMAIL_REGEX.test(emailTrimmed)) {
      setErrorMessage('Institutional access only. Please use your official @kiit.ac.in student email.');
      return;
    }

    if (!loginForm.password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(emailTrimmed, loginForm.password);
      if (res.success) {
        setSuccessMessage('Logged in successfully! Redirecting...');
        toast.success(`Welcome back, ${res.data?.fullName || 'Student'}!`);
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        const msg = res.error || 'Invalid institutional credentials';
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.message || 'Network error during login';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Full name check
    if (!signupForm.fullName.trim()) {
      setErrorMessage('Please provide your full legal name');
      return;
    }

    // Strict Institutional Email check
    const emailTrimmed = signupForm.email.trim().toLowerCase();
    if (!KIIT_EMAIL_REGEX.test(emailTrimmed)) {
      setErrorMessage('Institutional access only. Student registration strictly requires an official @kiit.ac.in email address.');
      return;
    }

    // Password requirements
    if (signupForm.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters in length');
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password entry.');
      return;
    }

    // Phone validation
    const cleanPhone = signupForm.phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    setSubmitting(true);
    try {
      const res = await signup({
        fullName: signupForm.fullName.trim(),
        email: emailTrimmed,
        password: signupForm.password,
        confirmPassword: signupForm.confirmPassword,
        academicYear: signupForm.academicYear,
        programme: signupForm.programme,
        branch: signupForm.branch,
        school: signupForm.school,
        phoneNumber: cleanPhone
      });

      if (res.success) {
        setSuccessMessage('Student account created successfully! Welcome to FESTIQ.');
        toast.success(`Welcome to FESTIQ, ${res.data?.fullName || 'Student'}!`);
        setTimeout(() => {
          onClose();
        }, 700);
      } else {
        const msg = res.error || 'Failed to complete registration';
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.message || 'Network error during signup';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setDevTokenNotice(null);

    const emailTrimmed = forgotEmail.trim();
    if (!emailTrimmed) {
      setErrorMessage('Please enter your registered institutional email');
      return;
    }

    if (!KIIT_EMAIL_REGEX.test(emailTrimmed)) {
      setErrorMessage('Institutional access only. Please provide your official @kiit.ac.in email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestForgotPassword(emailTrimmed);
      if (res.success) {
        setSuccessMessage(res.message);
        toast.info(res.message);
        if (res.devResetToken) {
          setDevTokenNotice({
            notice: res.devNotice,
            token: res.devResetToken
          });
          setResetForm((prev) => ({ ...prev, token: res.devResetToken }));
        }
      } else {
        const msg = res.error || 'Failed to dispatch password reset request';
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.message || 'Network error requesting password reset';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const tokenTrimmed = resetForm.token.trim();
    if (!tokenTrimmed) {
      setErrorMessage('Please enter the password reset token');
      return;
    }

    if (!resetForm.newPassword) {
      setErrorMessage('Please enter a new password');
      return;
    }

    if (resetForm.newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters in length');
      return;
    }

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitPasswordReset({
        token: tokenTrimmed,
        newPassword: resetForm.newPassword,
        confirmPassword: resetForm.confirmPassword
      });

      if (res.success) {
        setSuccessMessage('Password has been securely reset! You may now log in.');
        toast.success('Password updated successfully!');
        setResetForm({ token: '', newPassword: '', confirmPassword: '' });
        setDevTokenNotice(null);
        setTimeout(() => {
          handleTabSwitch('login');
        }, 1200);
      } else {
        const msg = res.error || 'Failed to reset password';
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.message || 'Network error resetting password';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-modal-brand">
            <FestiqLogo variant="symbol" size={42} className="auth-modal-crest" />
            <div className="auth-modal-brand-text">
              <span className="auth-modal-title">Student Portal</span>
              <span className="auth-modal-subtitle">KIIT University Events</span>
            </div>
          </div>
          <button 
            type="button" 
            className="auth-modal-close" 
            onClick={onClose}
            aria-label="Close authentication modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'login'}
            className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('login')}
          >
            Log In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'signup'}
            className={`auth-tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('signup')}
          >
            Create Account
          </button>
        </div>

        {/* Institutional Verification Notice */}
        <div className="auth-notice-banner institutional-notice">
          <ShieldCheck size={16} className="notice-icon" />
          <span className="notice-text">
            <strong>KIIT Institutional Access:</strong> Exclusive to students with valid <code>@kiit.ac.in</code> credentials.
          </span>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="auth-feedback-banner auth-feedback-error">
            <AlertCircle size={16} className="feedback-icon error-icon" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Feedback */}
        {successMessage && (
          <div className="auth-feedback-banner auth-feedback-success">
            <ShieldCheck size={16} className="feedback-icon success-icon" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Login Tab Content */}
        {activeTab === 'login' && (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <div className="auth-field-group">
              <label htmlFor="login-email">Institutional Email</label>
              <div className="input-with-icon">
                <Mail size={16} className="field-icon" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="e.g. demo.student@kiit.ac.in"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="field-icon" />
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <div className="auth-field-helper">
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => handleTabSwitch('forgot')}
              >
                Forgot Password?
              </button>
            </div>

            <Button
              variant="primary"
              size="md"
              type="submit"
              className="auth-submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Authenticating...' : 'Log In to Student Portal'}
            </Button>

            <div className="auth-switch-prompt">
              <span>Don't have an account yet?</span>{' '}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => handleTabSwitch('signup')}
              >
                Create student account
              </button>
            </div>
          </form>
        )}

        {/* Forgot Password View */}
        {activeTab === 'forgot' && (
          <form className="auth-form" onSubmit={handleForgotPasswordSubmit}>
            <div className="auth-view-header">
              <h3 className="auth-view-title">Reset Your Password</h3>
              <p className="auth-view-subtitle">Enter your official university email address and we'll dispatch a secure reset token.</p>
            </div>

            <div className="auth-field-group">
              <label htmlFor="forgot-email">Official Institutional Email (@kiit.ac.in)</label>
              <div className="input-with-icon">
                <Mail size={16} className="field-icon" />
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="e.g. demo.student@kiit.ac.in"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {devTokenNotice && (
              <div className="dev-token-banner">
                <div className="dev-token-header">
                  <KeyRound size={15} />
                  <span>{devTokenNotice.notice}</span>
                </div>
                <div className="dev-token-code">
                  <code>{devTokenNotice.token}</code>
                </div>
                <button
                  type="button"
                  className="dev-token-action-btn"
                  onClick={() => {
                    setResetForm((prev) => ({ ...prev, token: devTokenNotice.token }));
                    handleTabSwitch('reset');
                  }}
                >
                  Proceed to Set New Password →
                </button>
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              type="submit"
              className="auth-submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Dispatching Instructions...' : 'Request Password Reset Token'}
            </Button>

            <div className="auth-switch-prompt">
              <button
                type="button"
                className="auth-switch-link inline-flex-center"
                onClick={() => handleTabSwitch('login')}
              >
                <ArrowLeft size={14} style={{ marginRight: 4 }} /> Back to Log In
              </button>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>•</span>
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => handleTabSwitch('reset')}
              >
                Already have a token?
              </button>
            </div>
          </form>
        )}

        {/* Reset Password View */}
        {activeTab === 'reset' && (
          <form className="auth-form" onSubmit={handleResetPasswordSubmit}>
            <div className="auth-view-header">
              <h3 className="auth-view-title">Set New Password</h3>
              <p className="auth-view-subtitle">Provide your verification token and enter a strong new password (minimum 8 characters).</p>
            </div>

            <div className="auth-field-group">
              <label htmlFor="reset-token">Password Reset Token</label>
              <div className="input-with-icon">
                <KeyRound size={16} className="field-icon" />
                <input
                  id="reset-token"
                  type="text"
                  placeholder="Paste 64-character reset token"
                  value={resetForm.token}
                  onChange={(e) => setResetForm({ ...resetForm, token: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label htmlFor="reset-new-password">New Password (8+ characters)</label>
              <div className="input-with-icon">
                <Lock size={16} className="field-icon" />
                <input
                  id="reset-new-password"
                  type="password"
                  placeholder="••••••••"
                  value={resetForm.newPassword}
                  onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label htmlFor="reset-confirm-password">Confirm New Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="field-icon" />
                <input
                  id="reset-confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={resetForm.confirmPassword}
                  onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              type="submit"
              className="auth-submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Resetting Password...' : 'Save New Password & Complete'}
            </Button>

            <div className="auth-switch-prompt">
              <button
                type="button"
                className="auth-switch-link inline-flex-center"
                onClick={() => handleTabSwitch('login')}
              >
                <ArrowLeft size={14} style={{ marginRight: 4 }} /> Back to Log In
              </button>
            </div>
          </form>
        )}

        {/* Sign Up Tab Content */}
        {activeTab === 'signup' && (
          <form className="auth-form" onSubmit={handleSignupSubmit}>
            <div className="auth-field-group">
              <label htmlFor="signup-name">Full Legal Name</label>
              <div className="input-with-icon">
                <User size={16} className="field-icon" />
                <input
                  id="signup-name"
                  type="text"
                  placeholder="Aarav Sharma"
                  value={signupForm.fullName}
                  onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label htmlFor="signup-email">Official Institutional Email (@kiit.ac.in)</label>
              <div className="input-with-icon">
                <Mail size={16} className="field-icon" />
                <input
                  id="signup-email"
                  type="email"
                  placeholder="demo.student@kiit.ac.in"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  required
                />
              </div>
              <span className="field-help-text">Only official @kiit.ac.in email addresses are accepted</span>
            </div>

            <div className="auth-fields-row">
              <div className="auth-field-group">
                <label htmlFor="signup-year">Academic Year</label>
                <div className="input-with-icon">
                  <GraduationCap size={16} className="field-icon" />
                  <select
                    id="signup-year"
                    value={signupForm.academicYear}
                    onChange={(e) => setSignupForm({ ...signupForm, academicYear: e.target.value })}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                </div>
              </div>

              <div className="auth-field-group">
                <label htmlFor="signup-prog">Programme</label>
                <div className="input-with-icon">
                  <BookOpen size={16} className="field-icon" />
                  <select
                    id="signup-prog"
                    value={signupForm.programme}
                    onChange={(e) => setSignupForm({ ...signupForm, programme: e.target.value })}
                  >
                    <option value="B.Tech">B.Tech</option>
                    <option value="M.Tech">M.Tech</option>
                    <option value="BCA">BCA</option>
                    <option value="MCA">MCA</option>
                    <option value="BBA">BBA</option>
                    <option value="MBA">MBA</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="auth-field-group">
              <label htmlFor="signup-branch">Branch / Specialization</label>
              <input
                id="signup-branch"
                type="text"
                placeholder="e.g. Computer Science & Engineering"
                value={signupForm.branch}
                onChange={(e) => setSignupForm({ ...signupForm, branch: e.target.value })}
                required
              />
            </div>

            <div className="auth-field-group">
              <label htmlFor="signup-school">School / Faculty</label>
              <div className="input-with-icon">
                <Building2 size={16} className="field-icon" />
                <select
                  id="signup-school"
                  value={signupForm.school}
                  onChange={(e) => setSignupForm({ ...signupForm, school: e.target.value })}
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
              </div>
            </div>

            <div className="auth-field-group">
              <label htmlFor="signup-phone">Contact Phone Number</label>
              <div className="input-with-icon">
                <Phone size={16} className="field-icon" />
                <input
                  id="signup-phone"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={signupForm.phoneNumber}
                  onChange={(e) => setSignupForm({ ...signupForm, phoneNumber: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="auth-fields-row">
              <div className="auth-field-group">
                <label htmlFor="signup-pass">Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="field-icon" />
                  <input
                    id="signup-pass"
                    type="password"
                    placeholder="Min 8 characters"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div className="auth-field-group">
                <label htmlFor="signup-confirm">Confirm Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="field-icon" />
                  <input
                    id="signup-confirm"
                    type="password"
                    placeholder="Repeat password"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              type="submit"
              className="auth-submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Registering Account...' : 'Complete Institutional Registration'}
            </Button>

            <div className="auth-switch-prompt">
              <span>Already registered?</span>{' '}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => handleTabSwitch('login')}
              >
                Log in here
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
