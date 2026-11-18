# FESTIQ — Campus Event Discovery and Management Platform

> **Discover. Attend. Experience.**  
> University Campus Event Discovery & Management Platform for KIIT University

---

## 1. Project Overview

**FESTIQ** is a modern, responsive, multi-page campus event discovery and management platform. It centralizes university fests, national hackathons, esports tournaments, cultural galas, academic workshops, management conclaves, and athletic derbies into an intuitive interface with full dual-theme support, institutional student authentication, event registration, a past-event photo gallery, and an executive management portal for event coordinators.

---

## 2. Key Platform Features

* **Multi-Page Navigation:** Built with `react-router-dom` featuring dedicated routes for Home (`/`), Explore Events (`/events`), Campus Gallery (`/gallery`), Student Dashboard (`/dashboard`), Executive Operations Hub (`/manage`), Public Proposal Portal (`/host-event`), and Platform Overview (`/about`).
  * *Dynamic Authenticated Sidebar:* The sidebar dynamically adapts based on session state — authenticated students immediately see the **Dashboard** navigation item inserted at item 4 (`Home`, `Explore Events`, `Gallery`, `Dashboard`, `About`) without requiring a page refresh. Logged-out users only see public navigation.
* **Student Dashboard (`/dashboard`):**
  * **Personal Student Space:** Authenticated student hub displaying personalized welcome banner, KIIT branch, academic year, and roll number.
  * **Real-Time Participation KPIs:** Live counter metrics computed dynamically from user registrations: Total Registered Events, Upcoming Events, Admitted / Checked In at venue, and Completed Events.
  * **Interactive Filter Tabs & Search:** Filter registered events by status (`All`, `Upcoming`, `Completed`) with real-time keyword search across event titles, categories, and venues.
  * **Pass Action Integration:** Quick access to view scannable digital passes, inspect ticket status pills (`Ready for Entry`, `Checked In`, `Completed`), and link guest passes.
* **Automatic Digital Event Pass with Scannable QR Code:**
  * **Instant Pass Provisioning:** Every confirmed registration (authenticated student or guest) automatically generates a cryptographically secured digital pass with Pass ID (`PASS-2026-XXXXXX`) and Registration ID (`FST-XXXXXX`).
  * **High-Contrast Printable Ticket:** Authentic ticket pass design featuring perforated dashed divider, notch cutouts, institutional branding, attendee details, event metadata, admission status ribbon, and dedicated `@media print` stylesheet.
  * **Zero-PII Opaque QR Payload:** Generates a clean QR code encoding strictly opaque verification credentials (`{"p": passId, "t": token, "e": eventId}`). Zero sensitive personal information (no email, phone, or roll number) is exposed in the QR code.
  * **Constant-Time Verification:** Pass tokens are hashed using SHA-256 and verified using constant-time buffer comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
  * **Strict Student Pass Isolation:** Pass credentials and raw tokens are isolated to the owning student (`reg.userId === req.user.id`). Unauthorized requests return `401 Unauthorized` or `403 Forbidden`.
* **Guest Pass Claiming & Ownership Binding:**
  * **Post-Registration Account Binding:** Guest attendees who register prior to creating an account can claim and bind their pass permanently to their student account using their Pass ID and 32-character secret token via `POST /api/registrations/claim`.
  * **Tamper & Conflict Proof:** Prevents re-claiming passes already owned by other students (`409 Conflict`) and strictly validates token authenticity before updating ownership.
* **QR Check-in & Live Attendance Verification Hub (`/manage`):**
  * **Dedicated Operations Tab:** 3rd executive hub section in the Management Portal featuring an event selector and real-time attendance counter badge.
  * **Live Attendance Statistics:** Real-time metrics for any selected campus event: Total Registered, Checked-In / Admitted Count, Pending Admission Count, and Live Attendance Rate percentage.
  * **Dual Scanner Suite:**
    * *Camera Viewfinder:* Scans digital passes directly from attendee screens or printed passes using native `window.BarcodeDetector` or camera stream.
    * *Manual Fallback Panel:* Allows event coordinators to manually enter or paste Pass IDs / QR payloads with optional token input.
  * **Duplicate Check-In Protection:** Prevents attendees from reusing scanned passes (`409 Conflict`), providing the exact previous admission timestamp and admitting coordinator's name.
  * **Venue Mismatch Rejection:** Strictly verifies the scanned pass matches the active event (`400 Bad Request`), preventing students with passes for other events from entering the wrong venue.
  * **Live Admitted Attendees Table:** Real-time feed of admitted participants showing Pass ID, Attendee Name, Contact/Roll, Admission Timestamp, and Admitting Coordinator.
* **Complete 24-Event Catalogue:** 24 distinct campus events evenly balanced across 6 disciplines (4 events per category) with numeric prize pool calculation, capacity tracking, and rich descriptions.
* **Event Manager Details Across All Events:** Every event features dedicated coordinator information with clearly fictional manager names and non-operational demonstration contact numbers (`+91 00000 00001` - `+91 00000 00024`) with clickable `tel:` links.
* **Centralized Event Status Indicators:** Dynamic status engine (`eventStatus.js`) where `Completed` takes strict priority based on local calendar timezone end-of-day comparisons, alongside `Registration Open`, `Filling Fast`, `Registration Closed`, and `Upcoming`.
* **Campus Event Photo Gallery (`/gallery`):** Dedicated visual archive of past university celebrations, hackathons, and esports championships with category filtering, album cards, and a full-featured lightbox modal with keyboard navigation.
* **Public Host an Event & Institutional Approval Workflow (`/host-event`):**
  * **Dedicated Public Route:** Student societies, clubs, and departments can submit event proposals without requiring a pre-existing student or manager login.
  * **Secure Tracking Credentials:** Generates a unique Reference ID (`PROP-2026-XXXXX`) and an unpredictable 32-character hex Secret Tracking Token. Tokens are hashed with SHA-256 (`trackingTokenHash`) and compared with constant-time equality (`crypto.timingSafeEqual`) to prevent timing attacks. Secret tokens are never stored in plain text and are kept out of ordinary query parameters.
  * **8 Distinct Lifecycle Workflow Stages:** `Submitted`, `Under Review`, `Awaiting Organizer Information`, `Awaiting College Approval`, `Feasibility Review`, `Approved for Publication`, `Published`, and `Rejected`.
  * **Two-Gate Verification Preconditions:** Strict backend gating prevents direct or unverified event publication. Events require:
    1. *College / Faculty Verification:* Formally verified and recorded as `Approved` with faculty authority, school department, date, and reference remarks.
    2. *Operational Feasibility Assessment:* Formally assessed and recorded as `Acceptable` confirming venue availability, schedule clash clearance, audio-visual technical feasibility, and budget feasibility.
  * **Idempotent Catalogue Publication:** When all gates pass and status is `Approved for Publication`, managers execute catalogue publication. The event is atomically appended to `events.json`, the organizer is mapped as event manager, and the proposal transitions to `Published`. Repeated publication requests are handled failure-safely and idempotently without duplicating events.
  * **Secure Clarification Workflow:** When managers request additional information, the proposal enters `Awaiting Organizer Information`. Organizers can submit clarifications directly from the tracking view using their secret token, automatically transitioning the proposal back to `Under Review`.
  * **Confidentiality & Separation of Concerns:** Internal management notes, administrative audit logs, and faculty remarks are strictly redacted from public tracking endpoints.
* **Integrated Management Portal (`/manage`):**
  * **Role-Based Access Control (RBAC):** Protected by `requireAuth` and `requireManager` middleware. Public signup assigns `role: 'student'`; management privileges require safe CLI promotion.
  * **Real-Time KPI Dashboard:** Dynamic calculation of total published events, verified registrations, available seats (computed individually per event accounting for actual registrations), and total active prize pool.
  * **Participant Management Table:** Real-time search across participant name, email, roll number, and event; event-specific filtering; column sorting; and responsive table design with safe handling of missing fields.
  * **Sanitized CSV Export:** One-click RFC 4180 CSV export for all or filtered attendee records with proper character escaping. Strictly excludes password hashes, session tokens, and security metadata.
  * **Event Creation Suite:** Modal and backend API (`POST /api/events`) allowing authorized managers to publish new campus competitions with full schema validation and atomic persistence.
* **Dual-Theme Engine:** Seamlessly toggle between:
  * **Dark Theme:** *Midnight Forest + Champagne* (`#111B17`, `#0B1410`, `#18251F`, `#202F27`, `#293A30` with `#C6A96B` accents).
  * **Light Theme:** *Muted Grey-Beige + Academic Blue* (`#D6D9D2`, `#E1E4DE`, `#C5D6E5`, `#356B96`).
* **Institutional Authentication:** Student registration and login restricted to official `@kiit.ac.in` email addresses with regex lookalike domain rejection.
* **Cookie-Only Session Security:** Authenticated sessions use signed JSON Web Tokens (JWT) stored exclusively in secure, `httpOnly: true`, `SameSite=Lax` cookies. Zero credentials or tokens are stored in `localStorage` or `sessionStorage`.
* **CSRF & Origin Verification:** State-changing authentication, registration, and management requests enforce Origin and Referer validation against allowed domains.
* **Serialized JSON Persistence:** Asynchronous write queues prevent race conditions across concurrent user, registration, and event mutations using temporary files and atomic renames.

---

## 3. Technology Stack

### Frontend
* **React 18 & Vite:** Single-page architecture with fast Hot Module Replacement.
* **React Router DOM (v6):** Client-side routing with URL search parameter persistence.
* **Lucide React:** Lightweight, clean SVG iconography.
* **Custom Modular CSS:** Semantic CSS variables, CSS Grid, Flexbox, and responsive media queries (no third-party UI framework dependencies).

### Backend
* **Node.js (v18+):** Server runtime.
* **Express.js (v4.x):** REST API framework.
* **bcryptjs:** Salted password hashing (work factor 10).
* **jsonwebtoken:** Cryptographically signed session tokens containing user identity and role.
* **cookie-parser:** Parsing and handling HTTP-only cookies.
* **cors:** Configured for cross-origin credential exchange with the frontend.

### Persistence & Storage
* **Filesystem JSON Database:** Lightweight, file-based persistence via `events.json`, `users.json`, `registrations.json`, and `gallery.json` managed through asynchronous serialized queues and atomic write operations.

---

## 4. Event Catalogue Structure (24 Events)

The dataset contains exactly 24 events evenly distributed across 6 categories:

| Category | Event Count | Featured Highlights & Inclusions |
| :--- | :---: | :--- |
| **Technical** | 4 | HackNova: 36-Hour Hackathon (Featured), CodeSprint Challenge, AI Innovation Challenge, CyberShield CTF |
| **Cultural** | 4 | Rhythm & Echoes Gala (Featured), Sanskriti Classical Night, Thunderstruck Battle of the Bands, Canvas & Chronicle Art Expo |
| **Gaming** | 4 | Valorant & BGMI Showdown (Featured), Apex Arena Esports Trophy, Spike Rush Valorant Cup, EA Sports FC 26 Invitational |
| **Workshops** | 4 | Autonomous Drone Bootcamp, Embedded Systems Lab, Full-Stack Modern Web Velocity, Network Defense & Hardening |
| **Management** | 4 | Pragati Leadership Summit, Apex Venture Fest, BrandCraft Marketing Simulation, Global Consulting Challenge |
| **Sports** | 4 | Inter-Collegiate Futsal Derby (Featured), Hoop Fest 3v3 Basketball, Shuttle Surge Badminton, Campus T20 Smash Cricket |

---

## 5. Security & Management Authorization

### 5.1 Manager Account Provisioning
To prevent unauthorized privilege escalation and eliminate hardcoded passwords, management accounts cannot be created via public sign-up or with pre-set passwords.

1. The coordinator must first sign up through the regular FESTIQ portal using their official `@kiit.ac.in` email.
2. An administrator promotes the existing account to `manager` using the secure CLI tool:
   ```bash
   # From project root
   npm --prefix backend run promote:manager -- <demo.student@kiit.ac.in>
   
   # Or directly
   node backend/scripts/provision-manager.js <demo.student@kiit.ac.in>
   ```
3. Once promoted, the user can access `/manage`, inspect registrations, export CSVs, and publish new events.

### 5.2 Strict RBAC Enforcement
Every management endpoint (`POST /api/events`, `GET /api/manage/overview`, `GET /api/registrations`) requires valid cookie session authentication and verifies `req.user.role === 'manager' || req.user.role === 'admin'`. Unauthorized requests return `401 Unauthorized` (unauthenticated) or `403 Forbidden` (non-manager student).

---

## 6. How to Run Locally

### Prerequisites
* Node.js (v18.0.0 or later)
* npm (v9.0.0 or later)

### Step 1: Start the Backend Server
```bash
cd backend
npm install
npm run dev
```
* **Backend:** `http://localhost:5000`
* **Health Check:** `http://localhost:5000/api/health`
* **Events API:** `http://localhost:5000/api/events`
* **Gallery API:** `http://localhost:5000/api/gallery`

### Step 2: Start the Frontend Server (in a separate terminal)
```bash
cd frontend
npm install
npm run dev
```
* **Frontend:** `http://localhost:5173`
* Vite automatically proxies `/api` calls to `http://localhost:5000`.

### Production Build Verification
To verify production bundle compilation:
```bash
npm --prefix frontend run build
```

---

## 7. REST API Reference

### Events (`/api/events`)
* `GET /api/events` — Returns all events. Supports query parameters:
  * `category=<name>` (e.g. `Gaming`, `Technical`)
  * `featured=true` (returns flagship featured events)
  * `search=<query>` (case-insensitive keyword match across titles, descriptions, venues)
  * `sort=<mode>` (`upcoming`, `date-asc`, `date-desc`, `alpha-asc`)
* `GET /api/events/:id` — Returns single event object by unique ID or 404.
* `POST /api/events` — **Manager Protected.** Creates and persists a new campus event with full schema validation and atomic storage write.

### Gallery (`/api/gallery`)
* `GET /api/gallery` — Returns all archived event photo albums. Supports `?category=...` and `?featured=true`.
* `GET /api/gallery/:id` — Returns single gallery album by ID.

### Registrations & Digital Passes (`/api/registrations`)
* `POST /api/registrations` — Submits a registration for guests or authenticated students. Automatically generates a cryptographically secured digital pass (`passId`, `passTokenHash`, `passToken`). Validates event capacity and rejects duplicates (`409 Conflict`).
* `GET /api/registrations/my-registrations` — **Student Authenticated.** Returns the authenticated student's personalized registered events with enriched event metadata, category, venue, and pass summary.
* `GET /api/registrations/:id/pass` — **Student Authenticated.** Retrieves the scannable digital event pass credentials. Enforces strict student ownership isolation (`reg.userId === req.user.id`).
* `POST /api/registrations/claim` — **Student Authenticated.** Binds an unlinked guest registration pass to the caller's student account using the Pass ID and secret 32-character pass token.
* `GET /api/registrations` — **Manager Protected.** Returns enriched attendee registrations with event title and category resolution.

### Management Hub & QR Check-in (`/api/manage`)
* `GET /api/manage/overview` — **Manager Protected.** Returns real-time KPI metrics: total events, total registrations, dynamic available seats calculated per individual event, prize pool totals, checked-in attendee counts, and recent activity feed.
* `POST /api/manage/check-in` — **Manager Protected.** Admits an attendee by validating Pass ID, secret verification token, and event venue match. Records admission timestamp and coordinator name. Blocks duplicate admissions (`409 Conflict`) and wrong-event scans (`400 Bad Request`).
* `GET /api/manage/attendance/:eventId` — **Manager Protected.** Returns real-time attendance statistics for a specific event: total registered, checked-in count, pending count, attendance rate percentage, and recent admitted attendees.

### Event Proposals & Institutional Approval (`/api/proposals`)
* `POST /api/proposals` — **Public.** Submits a student organizer proposal. Validates inputs, generates Reference ID and 32-character secret tracking token, stores SHA-256 token hash, and sets initial status `Submitted`.
* `POST /api/proposals/track` — **Public.** Verifies Reference ID and secret token with constant-time equality. Returns sanitized proposal status, institutional pipeline progression, and public updates with internal notes strictly redacted.
* `POST /api/proposals/clarify` — **Public.** Submits organizer response when proposal is in `Awaiting Organizer Information`. Automatically transitions status to `Under Review`.
* `GET /api/proposals` — **Manager Protected.** Returns all proposals with optional `?status=...` and `?search=...` filtering.
* `GET /api/proposals/:id` — **Manager Protected.** Returns single proposal with audit history and private notes.
* `PATCH /api/proposals/:id/status` — **Manager Protected.** Transitions workflow status, appends internal notes and/or public organizer update notices.
* `POST /api/proposals/:id/verify-college` — **Manager Protected.** Records institutional authority, school department, date, and verification status (`Approved` or `Rejected`).
* `POST /api/proposals/:id/feasibility` — **Manager Protected.** Records operational assessment: venue availability, schedule clash check, technical facilities, budget feasibility, and status (`Acceptable` or `Unacceptable`).
* `POST /api/proposals/:id/publish` — **Manager Protected.** Validates mandatory gates (College `Approved`, Feasibility `Acceptable`, Status `Approved for Publication`). Atomically writes event to `events.json`, maps organizer as manager, updates proposal to `Published`, and prevents duplicates idempotently.

### Authentication (`/api/auth`)
* `POST /api/auth/signup` — Registers a student with strict `@kiit.ac.in` email and sets an HTTP-only session cookie (assigns `role: 'student'`).
* `POST /api/auth/login` — Authenticates credentials and sets an HTTP-only session cookie.
* `GET /api/auth/me` — Restores session state from the HTTP-only cookie.
* `PUT /api/auth/profile` — Updates mutable student fields (email and role are immutable).
* `POST /api/auth/logout` — Clears the HTTP-only session cookie.

---

## 8. Demonstration Dataset & Known Limitations

* **Fictional Demonstration Dataset:** The 24 events, gallery media, coordinator names, and contact numbers (`+91 00000 00001` - `+91 00000 00024`) presented on this platform are demonstration records designed to showcase platform capabilities. They do not represent real personal contact details, officially scheduled university events, or contracted partnerships.
* **Institutional Domain Validation vs. Mailbox Possession:** Domain validation verifies that registration emails end in `@kiit.ac.in`. Out-of-band email activation links and OTP verification are not currently implemented and are planned for future production phases.
* **File-Based Persistence:** Data is stored in atomic JSON files suited for local evaluation. Production deployment would transition to a database engine (e.g., PostgreSQL).
