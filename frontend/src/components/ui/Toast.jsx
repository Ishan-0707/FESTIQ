import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import './Toast.css';

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast.duration) return;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 size={18} className="toast-icon success" />;
      case 'error':
        return <AlertCircle size={18} className="toast-icon error" />;
      case 'warning':
        return <AlertTriangle size={18} className="toast-icon warning" />;
      default:
        return <Info size={18} className="toast-icon info" />;
    }
  };

  return (
    <div className={`festiq-toast toast-${toast.type}`} role="status" aria-live="polite">
      <div className="toast-icon-wrap">{getIcon()}</div>
      <div className="toast-content">
        {toast.title && <h5 className="toast-title">{toast.title}</h5>}
        <p className="toast-message">{toast.message}</p>
      </div>
      <button
        type="button"
        className="toast-close-btn"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
      {toast.duration > 0 && (
        <div
          className="toast-progress-bar"
          style={{ animationDuration: `${toast.duration}ms` }}
        />
      )}
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="festiq-toast-container" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
}

