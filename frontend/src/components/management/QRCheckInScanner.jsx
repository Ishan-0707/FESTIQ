import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Ticket,
  Users,
  Search,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { checkInPassAdmin, fetchEventAttendanceAdmin } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import './QRCheckInScanner.css';

export default function QRCheckInScanner({
  eventOptions = [],
  selectedEventId: initialEventId,
  onAttendanceUpdated
}) {
  const toast = useToast();
  const [selectedEventId, setSelectedEventId] = useState(
    initialEventId || eventOptions[0]?.id || ''
  );

  const [stats, setStats] = useState({
    totalRegistrations: 0,
    checkedInCount: 0,
    pendingCount: 0,
    attendancePercentage: 0,
    recentCheckIns: []
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Manual Check-in Form State
  const [manualPassId, setManualPassId] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [processingCheckIn, setProcessingCheckIn] = useState(false);

  // Scan Result Banner
  const [scanResult, setScanResult] = useState(null); // { type: 'success' | 'error', message, data? }

  // Camera Scanner State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanningLoopRef = useRef(false);
  const lastScannedTimeRef = useRef(0);

  // Synchronize initial event if changed
  useEffect(() => {
    if (initialEventId && initialEventId !== selectedEventId) {
      setSelectedEventId(initialEventId);
    }
  }, [initialEventId]);

  // Load attendance stats when event changes
  const loadStats = useCallback(async (eventId) => {
    if (!eventId) return;
    setLoadingStats(true);
    try {
      const res = await fetchEventAttendanceAdmin(eventId);
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn('[QR Check-in] Error loading attendance stats:', err.message);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadStats(selectedEventId);
    }
  }, [selectedEventId, loadStats]);

  // Core Check-in Execution
  const processCheckIn = async (passId, token) => {
    if (!passId) return;
    setProcessingCheckIn(true);
    setScanResult(null);

    try {
      const res = await checkInPassAdmin({
        eventId: selectedEventId,
        passId: passId.trim(),
        token: token ? token.trim() : null
      });

      if (res.success && res.data) {
        setScanResult({
          type: 'success',
          message: res.message || 'Check-in confirmed!',
          data: res.data
        });
        toast.success(`Check-in Confirmed: ${res.data.participantName || 'Attendee'}`);
        setManualPassId('');
        setManualToken('');
        // Refresh attendance stats
        loadStats(selectedEventId);
        if (onAttendanceUpdated) onAttendanceUpdated();
      }
    } catch (err) {
      setScanResult({
        type: 'error',
        message: err.message || 'Check-in rejected',
        alreadyCheckedIn: err.alreadyCheckedIn,
        checkedInAt: err.checkedInAt
      });
      if (err.alreadyCheckedIn) {
        toast.warning(err.message || 'Attendee is already checked in.');
      } else {
        toast.error(err.message || 'Check-in rejected.');
      }
    } finally {
      setProcessingCheckIn(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualPassId.trim()) return;

    // Check if user pasted a JSON string from QR payload
    let targetPassId = manualPassId.trim();
    let targetToken = manualToken.trim();

    try {
      if (targetPassId.startsWith('{') && targetPassId.endsWith('}')) {
        const parsed = JSON.parse(targetPassId);
        if (parsed.p) targetPassId = parsed.p;
        if (parsed.t) targetToken = parsed.t;
      }
    } catch {
      // not JSON, use as-is
    }

    processCheckIn(targetPassId, targetToken);
  };

  // -------------------------------------------------------------
  // Camera Scanner implementation with BarcodeDetector / Canvas
  // -------------------------------------------------------------
  const startCamera = async () => {
    setCameraError(null);
    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      scanningLoopRef.current = true;
      runBarcodeDetectionLoop();
    } catch (err) {
      console.error('[Scanner] Camera error:', err);
      setCameraError(
        'Could not access camera. Please allow camera permissions or use the manual Pass ID entry.'
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    scanningLoopRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Continuous frame detection using BarcodeDetector API
  const runBarcodeDetectionLoop = async () => {
    if (!scanningLoopRef.current) return;

    if ('BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

        const scanFrame = async () => {
          if (!scanningLoopRef.current || !videoRef.current) return;

          if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const rawVal = barcodes[0].rawValue;
                const now = Date.now();
                // Debounce 2 seconds between scans
                if (now - lastScannedTimeRef.current > 2000) {
                  lastScannedTimeRef.current = now;
                  handleScannedQrString(rawVal);
                }
              }
            } catch (detErr) {
              // Frame detection error, ignore
            }
          }

          if (scanningLoopRef.current) {
            requestAnimationFrame(scanFrame);
          }
        };

        requestAnimationFrame(scanFrame);
        return;
      } catch (e) {
        console.warn('[Scanner] BarcodeDetector init failed:', e);
      }
    }
  };

  const handleScannedQrString = (rawString) => {
    try {
      const parsed = JSON.parse(rawString);
      if (parsed.p) {
        processCheckIn(parsed.p, parsed.t);
        return;
      }
    } catch {
      // Raw string format fallback (e.g. PASS-2026-XXXX)
      processCheckIn(rawString, null);
    }
  };

  const selectedEvent = eventOptions.find((e) => e.id === selectedEventId);

  return (
    <div className="qr-checkin-wrapper">
      {/* Event Selector & Controls Bar */}
      <div className="checkin-event-selector-bar">
        <div className="event-selector-group">
          <label htmlFor="checkinEventSelect">Active Event for Admission:</label>
          <select
            id="checkinEventSelect"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            {eventOptions.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({ev.category})
              </option>
            ))}
          </select>
        </div>

        <div className="checkin-top-actions">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={() => loadStats(selectedEventId)}
            disabled={loadingStats}
          >
            Refresh Attendance
          </Button>
        </div>
      </div>

      {/* Attendance KPI Cards for Active Event */}
      <div className="checkin-metrics-grid">
        <div className="checkin-metric-card">
          <div className="checkin-metric-icon icon-blue">
            <Ticket size={20} />
          </div>
          <div className="checkin-metric-info">
            <span className="metric-num">{stats.totalRegistrations}</span>
            <span className="metric-name">Total Registered</span>
          </div>
        </div>

        <div className="checkin-metric-card">
          <div className="checkin-metric-icon icon-green">
            <CheckCircle2 size={20} />
          </div>
          <div className="checkin-metric-info">
            <span className="metric-num">{stats.checkedInCount}</span>
            <span className="metric-name">Checked In / Admitted</span>
          </div>
        </div>

        <div className="checkin-metric-card">
          <div className="checkin-metric-icon icon-amber">
            <Clock size={20} />
          </div>
          <div className="checkin-metric-info">
            <span className="metric-num">{stats.pendingCount}</span>
            <span className="metric-name">Pending Admission</span>
          </div>
        </div>

        <div className="checkin-metric-card">
          <div className="checkin-metric-icon icon-champagne">
            <Users size={20} />
          </div>
          <div className="checkin-metric-info">
            <span className="metric-num">{stats.attendancePercentage}%</span>
            <span className="metric-name">Attendance Rate</span>
          </div>
        </div>
      </div>

      {/* Scan Result Feedback Banner */}
      {scanResult && (
        <div
          className={`scan-feedback-banner ${
            scanResult.type === 'success' ? 'feedback-success' : 'feedback-error'
          }`}
        >
          {scanResult.type === 'success' ? (
            <div className="feedback-content">
              <div className="feedback-icon-box success">
                <CheckCircle2 size={28} />
              </div>
              <div className="feedback-text">
                <h4>Check-in Approved!</h4>
                <p className="feedback-sub">
                  <strong>{scanResult.data?.participantName}</strong> •{' '}
                  {scanResult.data?.rollNumber ? `Roll: ${scanResult.data.rollNumber} • ` : ''}
                  {scanResult.data?.email}
                </p>
                <div className="feedback-meta">
                  <span>Pass: <code>{scanResult.data?.passId}</code></span>
                  <span>Checked in at {new Date(scanResult.data?.checkedInAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="feedback-content">
              <div className="feedback-icon-box error">
                <AlertCircle size={28} />
              </div>
              <div className="feedback-text">
                <h4>Admission Rejected</h4>
                <p className="feedback-sub">{scanResult.message}</p>
                {scanResult.alreadyCheckedIn && scanResult.checkedInAt && (
                  <span className="already-meta">
                    Previously Checked in: {new Date(scanResult.checkedInAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
          <button
            type="button"
            className="feedback-dismiss-btn"
            onClick={() => setScanResult(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Dual Scanner Layout: Camera & Manual Entry */}
      <div className="checkin-scanner-grid">
        {/* Panel 1: Live Camera Viewfinder */}
        <div className="scanner-card camera-card">
          <div className="card-top-row">
            <div className="card-title-group">
              <Camera size={18} className="panel-icon" />
              <h3>Camera Viewfinder</h3>
            </div>
            {cameraActive ? (
              <Button
                variant="outline"
                size="sm"
                icon={<CameraOff size={15} />}
                onClick={stopCamera}
              >
                Stop Camera
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={<Camera size={15} />}
                onClick={startCamera}
              >
                Start Camera
              </Button>
            )}
          </div>

          <div className="camera-viewfinder-box">
            <video
              ref={videoRef}
              className={`scanner-video ${cameraActive ? 'active' : ''}`}
              playsInline
              muted
            />

            {cameraActive ? (
              <div className="scanner-reticle-overlay">
                <div className="reticle-box">
                  <div className="corner c-top-left" />
                  <div className="corner c-top-right" />
                  <div className="corner c-bottom-left" />
                  <div className="corner c-bottom-right" />
                  <div className="scan-laser-line" />
                </div>
                <span className="viewfinder-hint">Center student QR pass within frame</span>
              </div>
            ) : (
              <div className="camera-idle-placeholder">
                <QrCode size={56} className="idle-qr-icon" />
                <p>Click "Start Camera" to scan tickets using your device camera.</p>
                {cameraError && <span className="cam-error-text">{cameraError}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Manual Pass ID / Token Verification */}
        <div className="scanner-card manual-card">
          <div className="card-top-row">
            <div className="card-title-group">
              <Ticket size={18} className="panel-icon" />
              <h3>Manual Pass Verification</h3>
            </div>
          </div>

          <p className="manual-desc">
            If camera scanning is unavailable or the ticket code is smudged, enter the Pass ID or paste the QR payload below.
          </p>

          <form onSubmit={handleManualSubmit} className="manual-checkin-form">
            <div className="form-group">
              <label htmlFor="manualPassIdInput">Pass Identifier or Scanned Payload</label>
              <input
                type="text"
                id="manualPassIdInput"
                placeholder="e.g. PASS-2026-A1B2 or FST-123456"
                value={manualPassId}
                onChange={(e) => setManualPassId(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="manualTokenInput">Secret Pass Token (Optional if using Pass ID)</label>
              <input
                type="text"
                id="manualTokenInput"
                placeholder="Enter 32-character security token"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={processingCheckIn || !manualPassId.trim()}
              icon={<CheckCircle2 size={16} />}
              className="w-full"
            >
              {processingCheckIn ? 'Verifying Pass...' : 'Verify & Check In'}
            </Button>
          </form>
        </div>
      </div>

      {/* Real-Time Check-Ins List for Selected Event */}
      <div className="event-checkins-audit-card">
        <div className="audit-header-row">
          <div>
            <h3>Live Admitted Attendees</h3>
            <p className="audit-sub">
              {stats.recentCheckIns.length} attendee(s) admitted for{' '}
              <strong>{selectedEvent?.title || selectedEventId}</strong>
            </p>
          </div>
        </div>

        {stats.recentCheckIns.length === 0 ? (
          <div className="audit-empty-box">
            <Users size={32} className="empty-audit-icon" />
            <p>No attendees have been checked into this event yet.</p>
          </div>
        ) : (
          <div className="checkins-table-wrapper">
            <table className="checkins-table">
              <thead>
                <tr>
                  <th>Pass ID</th>
                  <th>Attendee Name</th>
                  <th>Roll / Email</th>
                  <th>Checked In At</th>
                  <th>Admitted By</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentCheckIns.map((ci) => (
                  <tr key={ci.passId}>
                    <td>
                      <code>{ci.passId}</code>
                    </td>
                    <td className="attendee-name-col">
                      <strong>{ci.participantName}</strong>
                    </td>
                    <td>
                      {ci.rollNumber ? <span>{ci.rollNumber} • </span> : null}
                      <span className="email-sub">{ci.email}</span>
                    </td>
                    <td className="time-col">
                      {ci.checkedInAt ? new Date(ci.checkedInAt).toLocaleTimeString() : '—'}
                    </td>
                    <td className="manager-col">
                      {ci.checkedInBy || 'Coordinator'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

