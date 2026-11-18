import React, { useId } from 'react';
import './FestiqLogo.css';

/**
 * FESTIQ Campus Crest (Option D)
 * Official Brand Emblem and Wordmark component.
 * Reproduces the approved Option D composition:
 * - Campus architecture at top (peaked pediment + classical columns)
 * - Central discovery star nested within the architectural portal
 * - Layered open-book / blooming-page foundation at bottom with cyan, gold & violet curves
 *
 * Supports Dark Theme (Midnight Forest + Champagne) and Light Theme (Muted Grey-Beige + Academic Blue)
 * via theme-aware CSS custom properties without requiring page reload.
 */
export default function FestiqLogo({
  variant = 'symbol',
  size = 'md',
  className = '',
  showTagline = false,
  tagline = 'Campus Events',
  ariaLabel = 'FESTIQ - Campus Events Platform'
}) {
  const reactId = useId().replace(/:/g, '');
  const uid = `crest-${reactId}`;

  // Pixel height resolution for the SVG emblem (Aspect ratio is 80:51)
  let pixelHeight = 38;
  let sizeClass = 'festiq-logo-md';

  if (typeof size === 'number') {
    pixelHeight = size;
    if (size <= 20) sizeClass = 'festiq-logo-xs';
    else if (size <= 28) sizeClass = 'festiq-logo-sm';
    else if (size <= 42) sizeClass = 'festiq-logo-md';
    else if (size <= 56) sizeClass = 'festiq-logo-lg';
    else sizeClass = 'festiq-logo-xl';
  } else {
    switch (size) {
      case 'xs':
        pixelHeight = 20;
        sizeClass = 'festiq-logo-xs';
        break;
      case 'sm':
        pixelHeight = 28;
        sizeClass = 'festiq-logo-sm';
        break;
      case 'lg':
        pixelHeight = 50;
        sizeClass = 'festiq-logo-lg';
        break;
      case 'xl':
        pixelHeight = 64;
        sizeClass = 'festiq-logo-xl';
        break;
      case 'md':
      default:
        pixelHeight = 38;
        sizeClass = 'festiq-logo-md';
        break;
    }
  }

  const pixelWidth = Math.round(pixelHeight * (80 / 51));

  // Pure SVG Campus Crest (Option D) Vector Emblem with tight zero-whitespace viewBox (10 12 80 51)
  const Emblem = (
    <svg
      viewBox="10 12 80 51"
      width={pixelWidth}
      height={pixelHeight}
      className="festiq-campus-crest-svg"
      role="img"
      aria-label={variant === 'symbol' ? ariaLabel : undefined}
      aria-hidden={variant === 'full'}
    >
      <defs>
        {/* Campus Architecture Gradient */}
        <linearGradient id={`${uid}-arch`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--logo-arch-1, #F3E5AB)" />
          <stop offset="50%" stopColor="var(--logo-arch-2, #C6A96B)" />
          <stop offset="100%" stopColor="var(--logo-arch-3, #9E7E38)" />
        </linearGradient>

        {/* Central Star Radiant Glow */}
        <radialGradient id={`${uid}-star`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--logo-star-core, #FFFFFF)" />
          <stop offset="45%" stopColor="var(--logo-star-body, #FFF4D4)" />
          <stop offset="100%" stopColor="var(--logo-star-glow, #C6A96B)" />
        </radialGradient>

        {/* Left Wing Upper (Cyan) */}
        <linearGradient id={`${uid}-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--logo-cyan-1, #22D3EE)" />
          <stop offset="60%" stopColor="var(--logo-cyan-2, #06B6D4)" />
          <stop offset="100%" stopColor="var(--logo-cyan-3, #0D9488)" />
        </linearGradient>

        {/* Left Wing Middle (Teal) */}
        <linearGradient id={`${uid}-teal`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--logo-teal-1, #06B6D4)" />
          <stop offset="100%" stopColor="var(--logo-teal-2, #0F766E)" />
        </linearGradient>

        {/* Right Wing Upper (Gold) */}
        <linearGradient id={`${uid}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--logo-gold-1, #FDE68A)" />
          <stop offset="50%" stopColor="var(--logo-gold-2, #F59E0B)" />
          <stop offset="100%" stopColor="var(--logo-gold-3, #C6A96B)" />
        </linearGradient>

        {/* Right Wing Middle (Deep Gold) */}
        <linearGradient id={`${uid}-gold-sub`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--logo-gold-sub-1, #F59E0B)" />
          <stop offset="100%" stopColor="var(--logo-gold-sub-2, #B45309)" />
        </linearGradient>

        {/* Bottom Open-Book Foundation (Royal Violet) */}
        <linearGradient id={`${uid}-violet`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--logo-violet-1, #A855F7)" />
          <stop offset="60%" stopColor="var(--logo-violet-2, #7C3AED)" />
          <stop offset="100%" stopColor="var(--logo-violet-3, #4F46E5)" />
        </linearGradient>
      </defs>

      {/* 1. TOP ARCHITECTURAL CAMPUS STRUCTURE */}
      {/* Roof Pediment Gable */}
      <path
        d="M 50,14 L 75,27 L 72,31 L 50,19.5 L 28,31 L 25,27 Z"
        fill={`url(#${uid}-arch)`}
      />
      {/* Horizontal Cornice / Lintel */}
      <rect
        x="31"
        y="31.5"
        width="38"
        height="3"
        rx="0.8"
        fill={`url(#${uid}-arch)`}
      />
      {/* Classical Portico Pillars / Columns */}
      <rect x="34" y="34.5" width="4.5" height="13.5" rx="0.6" fill={`url(#${uid}-arch)`} />
      <rect x="42.5" y="34.5" width="3" height="13.5" rx="0.5" fill={`url(#${uid}-arch)`} opacity="0.9" />
      <rect x="54.5" y="34.5" width="3" height="13.5" rx="0.5" fill={`url(#${uid}-arch)`} opacity="0.9" />
      <rect x="61.5" y="34.5" width="4.5" height="13.5" rx="0.6" fill={`url(#${uid}-arch)`} />

      {/* 2. CENTRAL DISCOVERY STAR */}
      <path
        d="M 50,33.5 Q 50,41 44,41 Q 50,41 50,48.5 Q 50,41 56,41 Q 50,41 50,33.5 Z"
        fill={`url(#${uid}-star)`}
      />
      {/* Radiant Spark Core */}
      <circle cx="50" cy="41" r="1.2" fill="var(--logo-star-core, #FFFFFF)" />

      {/* 3. BOTTOM OPEN-BOOK / BLOOMING WING LAYERS */}
      {/* Left Wing 1 (Upper Cyan with tip star) */}
      <path
        d="M 48,51 C 38,49 26,43 17,33 C 17,33 21,32 23,34 C 30,40 40,44 48,45 Z"
        fill={`url(#${uid}-cyan)`}
      />
      {/* Delicate Spark Accent on Upper Left Wing Tip */}
      <path
        d="M 14,27.5 Q 14,30.5 11.5,30.5 Q 14,30.5 14,33.5 Q 14,30.5 16.5,30.5 Q 14,30.5 14,27.5 Z"
        fill="var(--logo-tip-spark, #67E8F9)"
      />

      {/* Left Wing 2 (Middle Teal) */}
      <path
        d="M 48,54.5 C 37,53.5 26,48.5 18,42 C 20,41 23,42 26,44 C 33,48 41,50 48,50 Z"
        fill={`url(#${uid}-teal)`}
      />

      {/* Left Wing 3 (Bottom Foundation Violet) */}
      <path
        d="M 50,60 C 39,61 28,58 20,52 C 22,51 25,52 28,54 C 35,57 43,57 50,56 Z"
        fill={`url(#${uid}-violet)`}
      />

      {/* Right Wing 1 (Upper Gold) */}
      <path
        d="M 52,51 C 62,49 74,43 83,33 C 83,33 79,32 77,34 C 70,40 60,44 52,45 Z"
        fill={`url(#${uid}-gold)`}
      />

      {/* Right Wing 2 (Middle Deep Gold) */}
      <path
        d="M 52,54.5 C 63,53.5 74,48.5 82,42 C 80,41 77,42 74,44 C 67,48 59,50 52,50 Z"
        fill={`url(#${uid}-gold-sub)`}
      />

      {/* Right Wing 3 (Bottom Foundation Violet) */}
      <path
        d="M 50,60 C 61,61 72,58 80,52 C 78,51 75,52 72,54 C 65,57 57,57 50,56 Z"
        fill={`url(#${uid}-violet)`}
      />
    </svg>
  );

  const wrapperStyle = typeof size === 'number'
    ? { '--logo-emblem-height': `${pixelHeight}px` }
    : undefined;

  if (variant === 'symbol') {
    return (
      <span
        className={`festiq-logo-wrapper festiq-logo-symbol-only ${sizeClass} ${className}`.trim()}
        style={wrapperStyle}
      >
        {Emblem}
      </span>
    );
  }

  return (
    <div
      className={`festiq-logo-wrapper festiq-logo-full ${sizeClass} ${className}`.trim()}
      style={wrapperStyle}
      aria-label={ariaLabel}
    >
      {Emblem}
      <div className="festiq-logo-text-group">
        <span className="festiq-logo-title">
          FESTI<span className="title-accent">Q</span>
        </span>
        {showTagline && (
          <span className="festiq-logo-tagline">{tagline}</span>
        )}
      </div>
    </div>
  );
}
