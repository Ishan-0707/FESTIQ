import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import eventRoutes from './routes/eventRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import manageRoutes from './routes/manageRoutes.js';
import proposalRoutes from './routes/proposalRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { verifyOriginCsrf } from './middleware/csrfProtection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Proper reverse-proxy header handling for accurate client IP rate limiting
app.set('trust proxy', 1);

// Explicit CORS Origin Allowlist Configuration (Separate dev and prod)
const isProduction = process.env.NODE_ENV === 'production';
const devAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
];

const prodAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : (process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN.trim()] : []);

const effectiveAllowedOrigins = isProduction
  ? prodAllowedOrigins
  : [...devAllowedOrigins, ...(process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN.trim()] : [])];

app.use(cors({
  origin: function (origin, callback) {
    // Permit requests without an Origin header (such as curl, same-origin, webhooks, or mobile clients)
    if (!origin) {
      return callback(null, true);
    }

    if (effectiveAllowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Explicitly reject unauthorized foreign origins
    const corsError = new Error(`CORS access denied: Origin '${origin}' is not authorized by FESTIQ allowlist.`);
    corsError.status = 403;
    return callback(corsError, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Razorpay-Signature', 'X-CSRF-Token', 'x-test-bypass']
}));

app.use(cookieParser());
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(verifyOriginCsrf);

// Serve local upload assets (e.g. gallery images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging for dev transparency
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'FESTIQ backend is running',
    timestamp: new Date().toISOString()
  });
});

// Feature routes
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/manage', manageRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/payments', paymentRoutes);

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('CORS access denied')) {
    return res.status(403).json({
      success: false,
      message: err.message
    });
  }

  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    error: isProduction ? undefined : err.message
  });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  FESTIQ Express Server running on port ${PORT}`);
  console.log(`  Healthcheck: http://localhost:${PORT}/api/health`);
  console.log(`  Events API:  http://localhost:${PORT}/api/events`);
  console.log(`===============================================`);
});

