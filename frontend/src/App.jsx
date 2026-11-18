import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TopBar from './components/layout/TopBar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ExploreEventsPage from './pages/ExploreEventsPage';
import CalendarPage from './pages/CalendarPage';
import GalleryPage from './pages/GalleryPage';
import ManagementPage from './pages/ManagementPage';
import HostEventPage from './pages/HostEventPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import AboutPage from './pages/AboutPage';
import ScrollToTop from './components/common/ScrollToTop';
import AuthModal from './components/auth/AuthModal';
import ProfileModal from './components/auth/ProfileModal';
import RegistrationModal from './components/events/RegistrationModal';
import EventDetailsModal from './components/events/EventDetailsModal';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/ui/Toast';
import Button from './components/ui/Button';
import Badge from './components/ui/Badge';
import { checkBackendHealth, fetchEvents } from './services/api';

export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [selectedEventForReg, setSelectedEventForReg] = useState(null);
  const [previewEvent, setPreviewEvent] = useState(null);

  // Theme Management (Defaults to 'dark' Midnight Forest + Champagne, restores 'festiq-theme' from localStorage)
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('festiq-theme');
      if (saved === 'light' || saved === 'dark') return saved;
      const attr = document.documentElement.getAttribute('data-theme');
      if (attr === 'light' || attr === 'dark') return attr;
      return 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  // Synchronize theme to document element and localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('festiq-theme', theme);
    } catch (e) {
      console.warn('Unable to persist theme to localStorage', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Load events and check health on initial mount
  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      const health = await checkBackendHealth();
      setBackendHealth(health);

      const response = await fetchEvents();
      if (response.success) {
        setEvents(response.data);
      } else {
        setError(response.error || 'Failed to retrieve event records');
      }
    } catch (err) {
      setError(err.message || 'Network error connecting to backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleOpenRegistration = (event = null) => {
    setSelectedEventForReg(event);
    setRegistrationModalOpen(true);
  };

  const handleRegisterFromPreview = (event) => {
    setPreviewEvent(null);
    handleOpenRegistration(event);
  };

  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <ScrollToTop />
          <div className="festiq-app">
            <ToastContainer />

            {/* Main Content Shell (Full-width with Sticky Viewport TopBar) */}
            <div className="festiq-main-layout">
              {/* Sticky TopBar with Brand, Center Nav, Profile/Auth, & Mobile Drawer */}
              <TopBar
                currentTheme={theme}
                onToggleTheme={toggleTheme}
                onOpenAuthModal={() => setAuthModalOpen(true)}
                onOpenProfileModal={() => setProfileModalOpen(true)}
              />

          {/* Primary View Router */}
          <main>
            <Routes>
              {/* Home Page: Hero, Featured Events, Browse by Category preview */}
              <Route
                path="/"
                element={
                  <HomePage
                    events={events}
                    loading={loading}
                    error={error}
                    onRetry={loadInitialData}
                    onEventSelect={(event) => setPreviewEvent(event)}
                    onOpenRegister={handleOpenRegistration}
                    onRegisterEvent={handleOpenRegistration}
                  />
                }
              />

              {/* Explore Events Page: Full catalogue, search, category pills, registration */}
              <Route
                path="/events"
                element={
                  <ExploreEventsPage
                    events={events}
                    loading={loading}
                    error={error}
                    onRetry={loadInitialData}
                    onEventSelect={(event) => setPreviewEvent(event)}
                    onRegisterEvent={handleOpenRegistration}
                  />
                }
              />

              {/* Dedicated Event Calendar Page: Monthly Grid, Multiple Events per Date, My Schedule Filter */}
              <Route
                path="/calendar"
                element={
                  <CalendarPage
                    events={events}
                    loading={loading}
                    error={error}
                    onRetry={loadInitialData}
                    onEventSelect={(event) => setPreviewEvent(event)}
                    onOpenAuthModal={() => setAuthModalOpen(true)}
                  />
                }
              />

              {/* Gallery Page: Campus Event Photo Visual Archive & Lightbox */}
              <Route path="/gallery" element={<GalleryPage />} />

              {/* Public Host an Event & Proposal Submission/Tracking */}
              <Route path="/host-event" element={<HostEventPage />} />

              {/* Student Dashboard: Personal Event Passes & QR Check-in Tickets */}
              <Route
                path="/dashboard"
                element={<StudentDashboardPage onOpenAuthModal={() => setAuthModalOpen(true)} />}
              />

              {/* Management Operations Hub: Dashboard KPIs, Participant Table, CSV Export, Event Creation */}
              <Route
                path="/manage"
                element={
                  <ManagementPage
                    onOpenAuthModal={() => setAuthModalOpen(true)}
                    onEventCreatedParent={() => loadInitialData()}
                  />
                }
              />
              <Route path="/management" element={<Navigate to="/manage" replace />} />

              {/* Backward compatibility: Old Categories route redirects seamlessly to /events */}
              <Route path="/categories" element={<Navigate to="/events" replace />} />

              {/* About Page: Platform overview and coursework context */}
              <Route path="/about" element={<AboutPage />} />

              {/* Fallback to Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Global Footer */}
          <Footer />
        </div>

        {/* 3. Combined Authentication Modal (Login / Sign Up Switchable Tabs) */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />

        {/* 3b. Student Profile Modal (View / Edit Student Profile) */}
        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
        />

        {/* 4. Event Registration Modal (Real POST /api/registrations) */}
        <RegistrationModal
          isOpen={registrationModalOpen}
          onClose={() => setRegistrationModalOpen(false)}
          events={events}
          preselectedEvent={selectedEventForReg}
          onSuccess={(reg) => {
            console.log('Registration confirmed:', reg);
          }}
        />

        {/* 5. Comprehensive Event Details Modal */}
        <EventDetailsModal
          isOpen={Boolean(previewEvent)}
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
          onRegister={handleRegisterFromPreview}
        />
      </div>
    </Router>
    </ToastProvider>
  </AuthProvider>
);
}
