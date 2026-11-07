/**
 * CSRF and Origin Protection Middleware
 *
 * Verifies Origin / Referer headers for all state-changing HTTP methods
 * (POST, PUT, PATCH, DELETE) to protect authenticated sessions and registration
 * endpoints from cross-site request forgery attacks.
 */

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

// If an environment-specified client origin is configured, include it
if (process.env.CLIENT_ORIGIN) {
  ALLOWED_ORIGINS.add(process.env.CLIENT_ORIGIN.trim());
}

if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach((origin) => {
    const trimmed = origin.trim();
    if (trimmed) ALLOWED_ORIGINS.add(trimmed);
  });
}

export function verifyOriginCsrf(req, res, next) {
  // Safe HTTP methods do not change state
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;

  let requestOrigin = null;

  if (originHeader) {
    requestOrigin = originHeader;
  } else if (refererHeader) {
    try {
      const parsed = new URL(refererHeader);
      requestOrigin = `${parsed.protocol}//${parsed.host}`;
    } catch {
      requestOrigin = null;
    }
  }

  // If origin/referer is specified, it MUST match the allowed list
  if (requestOrigin) {
    const normalized = requestOrigin.toLowerCase();
    const isAllowed = Array.from(ALLOWED_ORIGINS).some(
      (allowed) => allowed.toLowerCase() === normalized
    );

    if (!isAllowed) {
      console.warn(`[Security Alert] Blocked state-changing request from unauthorized origin: ${requestOrigin}`);
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cross-site request rejected by CSRF origin protection.'
      });
    }
  }

  next();
}

