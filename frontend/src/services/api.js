// Centralized API Service for FESTIQ
// Proxied via Vite to http://localhost:5000/api in development

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) {
      throw new Error(`Health check returned status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[FESTIQ API] Backend health check failed:', error.message);
    return { status: 'offline', message: error.message };
  }
}

export async function fetchEvents(params = {}) {
  const query = new URLSearchParams();
  if (params.category && params.category !== 'All') {
    query.append('category', params.category);
  }
  if (params.featured) {
    query.append('featured', 'true');
  }

  const queryString = query.toString() ? `?${query.toString()}` : '';

  try {
    const response = await fetch(`${API_BASE}/events${queryString}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch events (Status: ${response.status})`);
    }
    const result = await response.json();
    return {
      success: true,
      data: result.data || []
    };
  } catch (error) {
    console.error('[FESTIQ API] Error fetching events:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

export async function fetchEventById(id) {
  try {
    const response = await fetch(`${API_BASE}/events/${id}`);
    if (!response.ok) {
      throw new Error(`Event ${id} not found`);
    }
    const result = await response.json();
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error(`[FESTIQ API] Error fetching event ${id}:`, error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Manager: Create a new gallery album.
 */
export async function createGalleryAlbum(albumData) {
  try {
    const response = await fetch(`${API_BASE}/gallery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(albumData)
    });
    const result = await response.json();
    return {
      success: response.ok,
      data: result.data,
      message: result.message,
      error: response.ok ? null : result.message
    };
  } catch (error) {
    console.error('[FESTIQ API] Error creating gallery album:', error);
    return {
      success: false,
      error: error.message || 'Network error creating gallery album'
    };
  }
}

/**
 * Manager: Update an existing gallery album.
 */
export async function updateGalleryAlbum(id, albumData) {
  try {
    const response = await fetch(`${API_BASE}/gallery/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(albumData)
    });
    const result = await response.json();
    return {
      success: response.ok,
      data: result.data,
      message: result.message,
      error: response.ok ? null : result.message
    };
  } catch (error) {
    console.error(`[FESTIQ API] Error updating gallery album ${id}:`, error);
    return {
      success: false,
      error: error.message || 'Network error updating gallery album'
    };
  }
}

/**
 * Manager: Delete a gallery album.
 */
export async function deleteGalleryAlbum(id) {
  try {
    const response = await fetch(`${API_BASE}/gallery/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const result = await response.json();
    return {
      success: response.ok,
      message: result.message,
      error: response.ok ? null : result.message
    };
  } catch (error) {
    console.error(`[FESTIQ API] Error deleting gallery album ${id}:`, error);
    return {
      success: false,
      error: error.message || 'Network error deleting gallery album'
    };
  }
}

/**
 * Manager: Upload an image for the gallery.
 */
export async function uploadGalleryImage(imageBase64, originalFilename) {
  try {
    const response = await fetch(`${API_BASE}/gallery/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ imageBase64, originalFilename })
    });
    const result = await response.json();
    return {
      success: response.ok,
      data: result.data,
      message: result.message,
      error: response.ok ? null : result.message
    };
  } catch (error) {
    console.error('[FESTIQ API] Error uploading gallery image:', error);
    return {
      success: false,
      error: error.message || 'Network error uploading gallery image'
    };
  }
}

/**
 * Manager: Create a new gallery album.
 */
export async function createRegistration({ participantName, email, phone, eventId }) {
  try {
    const response = await fetch(`${API_BASE}/registrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        participantName,
        email,
        phone,
        eventId
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to submit registration');
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (error) {
    console.error('[FESTIQ API] Error recording registration:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// -------------------------------------------------------------
// Phase 7: Gallery & Management Portal Endpoints
// -------------------------------------------------------------

/**
 * Retrieve campus event photo gallery albums.
 */
export async function fetchGallery(params = {}) {
  const query = new URLSearchParams();
  if (params.category && params.category !== 'All') {
    query.append('category', params.category);
  }
  if (params.featured) {
    query.append('featured', 'true');
  }

  const queryString = query.toString() ? `?${query.toString()}` : '';

  try {
    const response = await fetch(`${API_BASE}/gallery${queryString}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch gallery (Status: ${response.status})`);
    }
    const result = await response.json();
    return {
      success: true,
      data: result.data || []
    };
  } catch (error) {
    console.error('[FESTIQ API] Error fetching gallery:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * Fetch a single gallery album by ID.
 */
export async function fetchGalleryById(id) {
  try {
    const response = await fetch(`${API_BASE}/gallery/${id}`);
    if (!response.ok) {
      throw new Error(`Gallery album ${id} not found`);
    }
    const result = await response.json();
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error(`[FESTIQ API] Error fetching gallery album ${id}:`, error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Fetch real-time management dashboard overview metrics.
 */
export async function fetchManagementOverview() {
  try {
    const response = await fetch(`${API_BASE}/manage/overview`, {
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch management overview');
    }
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error('[FESTIQ API] Error fetching management overview:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Retrieve enriched participant registrations for Management Portal.
 */
export async function fetchRegistrationsAdmin() {
  try {
    const response = await fetch(`${API_BASE}/registrations`, {
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch registrations');
    }
    return {
      success: true,
      data: result.data || [],
      count: result.count || 0
    };
  } catch (error) {
    console.error('[FESTIQ API] Error fetching admin registrations:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      count: 0
    };
  }
}

/**
 * Create a new campus event (Manager authorized).
 */
export async function createEvent(eventData) {
  try {
    const response = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(eventData)
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to create event'
      };
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (error) {
    console.error('[FESTIQ API] Error creating event:', error);
    return {
      success: false,
      error: error.message || 'Network error creating event'
    };
  }
}

// -------------------------------------------------------------
// Authentication & Student Profile Endpoints (Stage C)
// -------------------------------------------------------------

/**
 * Register a new student with strict @kiit.ac.in domain verification.
 */
export async function signupStudent(studentData) {
  try {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(studentData)
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to register account'
      };
    }

    return {
      success: true,
      user: result.user,
      message: result.message
    };
  } catch (error) {
    console.error('[FESTIQ Auth API] Signup error:', error);
    return {
      success: false,
      error: error.message || 'Network error during signup'
    };
  }
}

/**
 * Log in student using institutional email and password.
 */
export async function loginStudent({ email, password }) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Invalid institutional credentials'
      };
    }

    return {
      success: true,
      user: result.user,
      message: result.message
    };
  } catch (error) {
    console.error('[FESTIQ Auth API] Login error:', error);
    return {
      success: false,
      error: error.message || 'Network error during login'
    };
  }
}

/**
 * Check active session and fetch current logged-in student.
 */
export async function fetchCurrentUser() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include'
    });

    if (!response.ok) {
      return {
        success: false,
        user: null
      };
    }

    const result = await response.json();
    return {
      success: true,
      user: result.user
    };
  } catch (error) {
    console.warn('[FESTIQ Auth API] Session check warning:', error.message);
    return {
      success: false,
      user: null
    };
  }
}

/**
 * Update student profile (immutable email).
 */
export async function updateStudentProfile(profileData) {
  try {
    const response = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(profileData)
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to update profile'
      };
    }

    return {
      success: true,
      user: result.user,
      message: result.message
    };
  } catch (error) {
    console.error('[FESTIQ Auth API] Profile update error:', error);
    return {
      success: false,
      error: error.message || 'Network error updating profile'
    };
  }
}

/**
 * Log out student and clear HTTP-only session cookie.
 */
export async function logoutStudent() {
  try {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });

    const result = await response.json();
    return {
      success: response.ok,
      message: result.message
    };
  } catch (error) {
    console.error('[FESTIQ Auth API] Logout error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Request password reset instructions for registered institutional email.
 */
export async function requestForgotPassword(email) {
  try {
    const response = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const result = await response.json();
    return {
      success: response.ok,
      message: result.message,
      devNotice: result.devNotice,
      devResetToken: result.devResetToken,
      error: response.ok ? null : result.message
    };
  } catch (error) {
    console.error('[FESTIQ Auth API] Forgot password error:', error);
    return {
      success: false,
      error: error.message || 'Network error requesting password reset'
    };
  }
}

/**
 * Submit new password with verification token.
 */
export async function submitPasswordReset({ token, newPassword, confirmPassword }) {
  try {
    const response = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword, confirmPassword })
    });

    const result = await response.json();
    return {
      success: response.ok,
      message: result.message,
      error: response.ok ? null : result.message
    };
  } catch (error) {
    console.error('[FESTIQ Auth API] Reset password error:', error);
    return {
      success: false,
      error: error.message || 'Network error submitting password reset'
    };
  }
}

/**
 * Public: Submit a new event proposal.
 */
export async function submitEventProposal(proposalData) {
  try {
    const response = await fetch(`${API_BASE}/proposals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(proposalData)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to submit proposal');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Proposal submission error:', error);
    throw error;
  }
}

/**
 * Public: Track proposal status using Reference ID + Secret Tracking Token.
 */
export async function trackProposalStatus({ proposalId, trackingToken }) {
  try {
    const response = await fetch(`${API_BASE}/proposals/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ proposalId, trackingToken })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to verify proposal tracking token');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Proposal tracking error:', error);
    throw error;
  }
}

/**
 * Public: Submit organizer clarification for a proposal awaiting information.
 */
export async function submitProposalClarification({ proposalId, trackingToken, clarificationText, revisedDetails }) {
  try {
    const response = await fetch(`${API_BASE}/proposals/clarify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        proposalId,
        trackingToken,
        clarificationText,
        revisedDetails
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to submit clarification');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Clarification submission error:', error);
    throw error;
  }
}

/**
 * Manager: Retrieve all event proposals with optional search and filter.
 */
export async function fetchProposalsAdmin(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);

    const url = `${API_BASE}/proposals${query.toString() ? `?${query.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch proposals');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Admin fetch proposals error:', error);
    throw error;
  }
}

/**
 * Manager: Retrieve single proposal details with full review history.
 */
export async function fetchProposalByIdAdmin(id) {
  try {
    const response = await fetch(`${API_BASE}/proposals/${id}`, {
      method: 'GET',
      credentials: 'include'
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch proposal details');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Admin fetch proposal by id error:', error);
    throw error;
  }
}

/**
 * Manager: Update proposal workflow status, internal note, or public update message.
 */
export async function updateProposalStatusAdmin(id, { status, note, publicUpdate }) {
  try {
    const response = await fetch(`${API_BASE}/proposals/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ status, note, publicUpdate })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to update proposal status');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Admin update proposal status error:', error);
    throw error;
  }
}

/**
 * Manager: Record formal college / department verification.
 */
export async function recordCollegeVerificationAdmin(id, payload) {
  try {
    const response = await fetch(`${API_BASE}/proposals/${id}/verify-college`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to record college verification');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Record college verification error:', error);
    throw error;
  }
}

/**
 * Manager: Record operational feasibility assessment.
 */
export async function recordFeasibilityAdmin(id, payload) {
  try {
    const response = await fetch(`${API_BASE}/proposals/${id}/feasibility`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to record feasibility assessment');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Record feasibility error:', error);
    throw error;
  }
}

/**
 * Manager: Final catalogue publication gate.
 */
export async function publishProposalAdmin(id) {
  try {
    const response = await fetch(`${API_BASE}/proposals/${id}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to publish event to catalogue');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Publish proposal error:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// Student Dashboard, Digital Pass & QR Check-in Endpoints
// -------------------------------------------------------------

/**
 * Student: Fetch all registrations belonging to the authenticated student.
 */
export async function fetchMyRegistrations() {
  try {
    const response = await fetch(`${API_BASE}/registrations/my-registrations`, {
      method: 'GET',
      credentials: 'include'
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch personal registrations');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Error fetching my registrations:', error);
    throw error;
  }
}

/**
 * Student: Fetch individual pass details with ownership check.
 */
export async function fetchRegistrationPass(id) {
  try {
    const response = await fetch(`${API_BASE}/registrations/${id}/pass`, {
      method: 'GET',
      credentials: 'include'
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to retrieve digital pass');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Error fetching registration pass:', error);
    throw error;
  }
}

/**
 * Student: Claim an unlinked guest registration using Pass ID and Secret Token.
 */
export async function claimGuestPass({ passId, passToken }) {
  try {
    const response = await fetch(`${API_BASE}/registrations/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ passId, passToken })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to claim registration pass');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Error claiming registration:', error);
    throw error;
  }
}

/**
 * Manager: Check in an attendee pass (via scanned QR code or manual entry).
 */
export async function checkInPassAdmin({ eventId, passId, token }) {
  try {
    const response = await fetch(`${API_BASE}/manage/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ eventId, passId, token })
    });

    const result = await response.json();
    if (!response.ok) {
      const err = new Error(result.message || 'Check-in validation rejected');
      err.alreadyCheckedIn = Boolean(result.alreadyCheckedIn);
      err.checkedInAt = result.checkedInAt;
      throw err;
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Check-in error:', error);
    throw error;
  }
}

/**
 * Manager: Fetch live attendance metrics for an event.
 */
export async function fetchEventAttendanceAdmin(eventId) {
  try {
    const response = await fetch(`${API_BASE}/manage/attendance/${eventId}`, {
      method: 'GET',
      credentials: 'include'
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch attendance metrics');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Error fetching event attendance:', error);
    throw error;
  }
}

/**
 * Payments: Fetch public payment configuration.
 */
export async function fetchPaymentConfig() {
  try {
    const response = await fetch(`${API_BASE}/payments/config`, {
      method: 'GET',
      credentials: 'include'
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Error fetching payment config:', error);
    throw error;
  }
}

/**
 * Payments: Create server-side payment order for pending registration.
 */
export async function createPaymentOrder({ registrationId }) {
  try {
    const response = await fetch(`${API_BASE}/payments/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ registrationId })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create payment order');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Error creating payment order:', error);
    throw error;
  }
}

/**
 * Payments: Verify payment signature and confirm registration.
 */
export async function verifyPayment({ registrationId, orderId, paymentId, signature, method }) {
  try {
    const response = await fetch(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ registrationId, orderId, paymentId, signature, method })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Payment verification failed');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Error verifying payment:', error);
    throw error;
  }
}

/**
 * Payments: Simulate successful payment in development mode.
 */
export async function simulatePaymentSuccess({ registrationId, orderId }) {
  try {
    const response = await fetch(`${API_BASE}/payments/simulate-success`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ registrationId, orderId })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Payment simulation failed');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Error simulating payment:', error);
    throw error;
  }
}

/**
 * Manager: Auditable manual payment verification for cash/offline registrations.
 */
export async function verifyOfflinePaymentAdmin({ registrationId, remarks }) {
  try {
    const response = await fetch(`${API_BASE}/manage/registrations/${registrationId}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ remarks })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to verify offline payment');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Error in manual payment verification:', error);
    throw error;
  }
}

/**
 * Manager: Update an existing event's details, fee, and capacity.
 */
export async function updateEventAdmin(eventId, eventData) {
  try {
    const response = await fetch(`${API_BASE}/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(eventData)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to update event');
    }
    return result;
  } catch (error) {
    console.error('[FESTIQ API] Error updating event:', error);
    throw error;
  }
}
