# FESTIQ — Event Discovery and Management Platform

> **Discover. Attend. Experience.**  
> University Semester-End Web Designing Project Submission

---

## 1. Project Overview

**FESTIQ** is a modern, responsive, and visually dynamic event discovery and management website engineered for campus life. It centralizes university fests, hackathons, esports tournaments, cultural galas, and academic workshops into an intuitive, high-tech interface.

---

## 2. Technology Stack

### Mandatory Core Technologies (Examiner Specified)
* **HTML5:** Semantic page architecture (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`).
* **CSS3:** Custom CSS architecture using CSS variables, Flexbox, CSS Grid, media queries, and smooth micro-interactions.
* **JavaScript (ES6+):** Modern asynchronous execution (`async/await`, Fetch API, array transformations, DOM updates).
* **Git & GitHub:** Version control with structured commit history.

### Optional Frontend Technologies
* **React.js (v18+):** Single-page application architecture for reactive state and dynamic component rendering.
* **Vite:** Ultra-fast frontend build engine with HMR and local API proxying.
* **Lucide React:** Lightweight, clean SVG iconography.

### Backend & Persistence
* **Node.js:** Server-side JavaScript runtime.
* **Express.js (v4.x):** REST API framework delivering `/api/health`, `/api/events`, and `/api/registrations`.
* **Filesystem JSON Persistence:** Safe asynchronous file operations (`fs/promises`) storing data in `events.json` and `registrations.json` without requiring external database dependencies.

---

## 3. Project Structure

```
FESTIQ/
├── backend/
│   ├── data/
│   │   ├── events.json                 # Campus events dataset
│   │   └── registrations.json          # Persistent participant registrations
│   ├── controllers/
│   │   └── eventController.js          # File-based event retrieval & filtering
│   ├── routes/
│   │   ├── eventRoutes.js              # /api/events routes
│   │   └── registrationRoutes.js       # /api/registrations routes
│   ├── server.js                       # Express server entry point & /api/health
│   └── package.json                    # Backend dependencies
│
├── frontend/
│   ├── public/
│   │   └── favicon.svg                 # Branded SVG favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx & .css       # Sticky header & responsive drawer
│   │   │   ├── Hero.jsx & .css         # Hero section & platform stats
│   │   │   ├── FeaturedEvents.jsx & .css # Dynamic backend-fed event cards
│   │   │   ├── CategoryPreview.jsx & .css # Category pills section
│   │   │   └── Footer.jsx & .css       # Academic footer with links
│   │   ├── services/
│   │   │   └── api.js                  # Centralized fetch API service
│   │   ├── styles/
│   │   │   └── index.css               # Global CSS variables & layout system
│   │   ├── App.jsx                     # Root React view coordinator
│   │   └── main.jsx                    # React DOM mount point
│   ├── index.html                      # Semantic HTML5 host
│   ├── package.json                    # Frontend dependencies
│   └── vite.config.js                  # Vite server & /api proxy config
│
├── ROADMAP.md                          # Master architectural specification
├── README.md                           # Project documentation & run guide
└── .gitignore                          # Git ignore rules
```

---

## 4. How to Run Locally

### Prerequisites
* Node.js (v18.0.0 or later)
* npm (v9.0.0 or later)

### Step 1: Start Express Backend
```bash
cd backend
npm install
npm start
```
* Backend runs at: `http://localhost:5000`
* Healthcheck: `http://localhost:5000/api/health`
* Events API: `http://localhost:5000/api/events`

### Step 2: Start Vite Frontend (in a separate terminal)
```bash
cd frontend
npm install
npm run dev
```
* Frontend runs at: `http://localhost:5173`
* Vite automatically proxies `/api` calls to `http://localhost:5000`.

---

## 5. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend status & health check |
| `GET` | `/api/events` | List all events (supports `?category=...&featured=true`) |
| `GET` | `/api/events/:id` | Get individual event details by ID |
| `POST` | `/api/registrations` | Register a participant for an event |
| `GET` | `/api/registrations` | View all registrations |

---

## 6. Academic Compliance
This project satisfies all requirements specified by the university examiner:
1. Semantic HTML5 layout.
2. Custom CSS3 design with dark-mode palette and responsive media queries.
3. ES6+ JavaScript client and server logic.
4. Dynamic data fetching and client-server decoupling.
5. Robust input validation and persistent storage.

