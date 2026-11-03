// Centralized API Service for FESTIQ
// Proxied via Vite to http://localhost:5000/api in development

const API_BASE = '/api';

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

