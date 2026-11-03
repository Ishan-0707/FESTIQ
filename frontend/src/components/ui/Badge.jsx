import React from 'react';
import './Badge.css';

/**
 * Reusable FESTIQ Badge Component
 * @param {'technical' | 'cultural' | 'gaming' | 'workshops' | 'management' | 'sports' | 'featured' | 'default'} variant
 * @param {'sm' | 'md'} size
 * @param {React.ReactNode} icon - Optional icon
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon = null,
  className = '',
  ...props
}) {
  const normVariant = (variant || 'default').toLowerCase();
  const classes = [
    'festiq-badge',
    `badge-${normVariant}`,
    `badge-${size}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...props}>
      {icon && <span className="badge-icon">{icon}</span>}
      <span className="badge-text">{children}</span>
    </span>
  );
}
