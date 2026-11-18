import React from 'react';
import './Button.css';

/**
 * Reusable FESTIQ Button Component
 * @param {'primary' | 'secondary' | 'outline' | 'ghost'} variant - Button style variant
 * @param {'sm' | 'md' | 'lg'} size - Button size
 * @param {React.ReactNode} icon - Optional Lucide or SVG icon
 * @param {'left' | 'right'} iconPosition - Icon placement relative to text
 * @param {boolean} disabled - Disabled state
 * @param {boolean} loading - Loading state with spinner
 * @param {string} className - Additional CSS classes
 * @param {function} onClick - Click handler
 * @param {string} type - Button type ('button' | 'submit' | 'reset')
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  iconPosition = 'right',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const isDisabled = disabled || loading;
  const classes = [
    'festiq-btn',
    `btn-${variant}`,
    `btn-${size}`,
    isDisabled ? 'btn-disabled' : '',
    loading ? 'btn-loading' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {!loading && icon && iconPosition === 'left' && <span className="btn-icon left">{icon}</span>}
      <span className="btn-label">{children}</span>
      {!loading && icon && iconPosition === 'right' && <span className="btn-icon right">{icon}</span>}
    </button>
  );
}
