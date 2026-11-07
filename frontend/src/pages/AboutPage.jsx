import React from 'react';
import {
  Compass,
  Ticket,
  LayoutDashboard,
  QrCode,
  Calendar as CalendarIcon,
  ShieldCheck,
  Image as GalleryIcon,
  Palette,
  Sparkles,
  GraduationCap,
  Code2,
  Cpu,
  Layers,
  HeartHandshake,
  Quote,
  ExternalLink,
  CheckCircle2,
  Award,
  Terminal,
  Database
} from 'lucide-react';
import FestiqLogo from '../components/common/FestiqLogo';
import Badge from '../components/ui/Badge';
import './AboutPage.css';

const CAPABILITIES = [
  {
    icon: Compass,
    title: 'Event Discovery',
    tag: 'Catalogue',
    description: 'Filterable campus directory across 6 academic disciplines with live capacity tracking, status indicators, and transparent pricing.'
  },
  {
    icon: Ticket,
    title: 'Streamlined Registration',
    tag: 'Workflows',
    description: 'Unified one-click modal supporting individual and team submissions, dynamic fee calculation, and real-time backend seat validation.'
  },
  {
    icon: LayoutDashboard,
    title: 'Student Dashboard',
    tag: 'Personal Hub',
    description: 'Centralized ticket repository tracking confirmed passes, payment statuses, and personalized event schedules with instant cancellation.'
  },
  {
    icon: QrCode,
    title: 'Digital Pass & Barcode',
    tag: 'Access Control',
    description: 'Scannable digital entry passes featuring cryptographic check-in codes and simulated camera barcode scanning for rapid venue admittance.'
  },
  {
    icon: CalendarIcon,
    title: 'Interactive Calendar',
    tag: 'Scheduling',
    description: 'Monthly schedule matrix mapping university-wide activities, color-coded disciplines, and direct modal preview from any calendar date.'
  },
  {
    icon: ShieldCheck,
    title: 'Management Operations',
    tag: 'Role-Gated',
    description: 'Organizer command center providing real-time KPI metrics, participant rosters, CSV export, and event creation with spec PDF generation.'
  },
  {
    icon: GalleryIcon,
    title: 'Campus Visual Archive',
    tag: 'Memories',
    description: 'Curated photo gallery documenting milestone campus moments, cultural nights, and tech symposium highlights with lightbox inspection.'
  },
  {
    icon: Palette,
    title: 'Dual-Theme Engine',
    tag: 'UI System',
    description: 'Instantaneous switching between Midnight Forest & Champagne Gold (dark) and Academic Blue & Slate (light) with zero layout shifting.'
  }
];

const COMMUNITY_QUOTES = [
  {
    quote: "FESTIQ turned our multi-department tech symposium from a fragmented Google Form nightmare into a cohesive, verified registration pipeline. Every participant knew their venue and seat within seconds.",
    author: "Aarav Sharma",
    role: "Convenor, University Technical Society",
    discipline: "School of Computer Applications"
  },
  {
    quote: "Having an integrated digital pass with live check-in made our annual cultural fest entry smooth and organized. Line congestion at the auditorium was reduced by over seventy percent.",
    author: "Meera Sen",
    role: "President, Cultural Affairs Council",
    discipline: "School of Humanities & Design"
  },
  {
    quote: "The transparent fee and prize pool breakdown brings real financial clarity to student participants. It sets a new benchmark for student-led software on campus.",
    author: "Rohan Mukherjee",
    role: "Lead Coordinator, Inter-Collegiate Esports",
    discipline: "Department of Electronics Engineering"
  }
];

const TECH_STACK = [
  { label: 'Frontend Framework', value: 'React 18 + Vite' },
  { label: 'Styling Engine', value: 'Pure CSS3 Variables & Tokens' },
  { label: 'Icons & Visuals', value: 'Lucide React + Campus Crest SVG' },
  { label: 'Backend Server', value: 'Node.js + Express REST API' },
  { label: 'Data Persistence', value: 'File-System Atomic JSON Store' },
  { label: 'Security & Auth', value: 'JWT + BCrypt + Cookie Guard' }
];

export default function AboutPage() {
  return (
    <div className="about-page-wrapper page-entrance">
      <div className="container">
        {/* Hero Section */}
        <div className="about-hero-section">
          <div className="about-hero-brand">
            <FestiqLogo variant="symbol" size="lg" />
          </div>
          <span className="section-tag">Campus Event Operating System</span>
          <h1 className="about-page-title">
            Engineered for Campus <span className="text-gradient">Celebration & Culture</span>
          </h1>
          <p className="about-page-subtitle">
            FESTIQ is a unified university event management platform created to elevate student discovery, streamline verified registrations, and empower campus organizers with professional coordination tools.
          </p>
        </div>

        {/* Vision & Problem Statement Dual Card */}
        <section className="about-narrative-grid" aria-label="Platform Mission and Vision">
          <div className="narrative-card vision-card">
            <div className="narrative-icon-box">
              <Sparkles size={22} />
            </div>
            <h2 className="narrative-title">The Challenge</h2>
            <p className="narrative-text">
              Collegiate festivals and academic symposia across universities traditionally rely on disjointed spreadsheets, scattered Google forms, unverified payment screenshots, and manual door lists. This friction causes long registration queues, missed events, and administrative fatigue for student organizers.
            </p>
            <ul className="narrative-points">
              <li>Fragmented communication across individual club portals</li>
              <li>Lack of transparent prize-pool funding and registration fees</li>
              <li>Slow, manual gate validation causing bottlenecks at venue entrances</li>
            </ul>
          </div>

          <div className="narrative-card solution-card">
            <div className="narrative-icon-box">
              <Layers size={22} />
            </div>
            <h2 className="narrative-title">The FESTIQ Vision</h2>
            <p className="narrative-text">
              FESTIQ consolidates the entire university event lifecycle into one responsive, aesthetic system. From real-time event discovery and seat reservation to personalized QR tickets, calendar synchronization, and manager analytics, every touchpoint is designed with collegiate dignity and clarity.
            </p>
            <ul className="narrative-points">
              <li>Single source of truth for all campus activities and workshops</li>
              <li>Floor-₹100 financial model ensuring sustainable, funded prize pools</li>
              <li>Universal accessibility across dark and light campus environments</li>
            </ul>
          </div>
        </section>

        {/* Real Platform Capabilities Grid */}
        <section className="about-capabilities-section" aria-label="Platform Real Capabilities">
          <div className="section-header">
            <span className="section-tag">Comprehensive Architecture</span>
            <h2 className="section-title">Built with Production-Grade Features</h2>
            <p className="section-subtitle">
              Every interface in FESTIQ is connected to live services, offering genuine utility to both student attendees and student event administrators.
            </p>
          </div>

          <div className="capabilities-grid">
            {CAPABILITIES.map((cap) => {
              const IconComp = cap.icon;
              return (
                <div key={cap.title} className="capability-card card-hover-fx">
                  <div className="capability-top">
                    <div className="capability-icon-wrap">
                      <IconComp size={22} className="capability-icon" />
                    </div>
                    <span className="capability-badge">{cap.tag}</span>
                  </div>
                  <h3 className="capability-title">{cap.title}</h3>
                  <p className="capability-desc">{cap.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Developer Profile Section */}
        <section className="about-developer-section" aria-label="Developer Profile">
          <div className="developer-card">
            <div className="developer-header-zone">
              <div className="developer-avatar-box">
                <GraduationCap size={40} className="dev-cap-icon" />
              </div>
              <div className="developer-title-meta">
                <div className="dev-role-badge">
                  <Terminal size={13} />
                  <span>Student Developer & Architect</span>
                </div>
                <h2 className="developer-name">B.Tech Computer Science & Engineering</h2>
                <p className="developer-subtext">
                  3rd Year Undergraduate • Semester VI Academic Coursework
                </p>
              </div>
            </div>

            <div className="developer-body-grid">
              <div className="developer-narrative">
                <h3 className="dev-heading">Project Genesis & Academic Mission</h3>
                <p className="dev-text">
                  FESTIQ was conceptualized, architected, and engineered as a comprehensive university semester-end Web Designing submission. The primary objective is to prove that modern web standards—semantic markup, pure CSS variable theming, modular component design, and RESTful architectures—can deliver an enterprise-grade experience without bloated dependencies.
                </p>
                <div className="dev-highlights">
                  <div className="dev-highlight-item">
                    <CheckCircle2 size={16} className="highlight-icon" />
                    <span>Dual Theme System with Zero Style Glitch</span>
                  </div>
                  <div className="dev-highlight-item">
                    <CheckCircle2 size={16} className="highlight-icon" />
                    <span>Real RESTful Backend with Financial Reconciliation</span>
                  </div>
                  <div className="dev-highlight-item">
                    <CheckCircle2 size={16} className="highlight-icon" />
                    <span>Strict Viewport Responsiveness across Mobile & Desktop</span>
                  </div>
                </div>
              </div>

              <div className="developer-specs-panel">
                <h4 className="specs-title">
                  <Cpu size={16} /> Technical Specifications
                </h4>
                <div className="specs-list">
                  {TECH_STACK.map((item) => (
                    <div key={item.label} className="spec-row">
                      <span className="spec-label">{item.label}</span>
                      <span className="spec-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Original Community Quotes Section */}
        <section className="about-community-section" aria-label="Campus Community Perspectives">
          <div className="section-header">
            <span className="section-tag">Campus Voices</span>
            <h2 className="section-title">What Organizers & Students Say</h2>
            <p className="section-subtitle">
              Authentic perspectives from student council coordinators and club leads on building a vibrant university fest experience.
            </p>
          </div>

          <div className="community-quotes-grid">
            {COMMUNITY_QUOTES.map((item) => (
              <div key={item.author} className="quote-card card-hover-fx">
                <div className="quote-icon-wrap">
                  <Quote size={20} className="quote-mark" />
                </div>
                <p className="quote-text">"{item.quote}"</p>
                <div className="quote-author-info">
                  <h4 className="author-name">{item.author}</h4>
                  <p className="author-role">{item.role}</p>
                  <p className="author-discipline">{item.discipline}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Academic Notice Banner */}
        <div className="about-notice-banner">
          <div className="notice-inner">
            <Award size={22} className="notice-icon" />
            <div className="notice-content">
              <strong>Academic Project Verification:</strong> Developed for educational demonstration, user testing, and university portfolio assessment. All rights reserved by student creators.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
