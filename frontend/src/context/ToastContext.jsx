import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ message, type = 'info', title = null, duration = 3500 }) => {
    let generatedId = null;
    setToasts((prev) => {
      // Prevent identical toast messages from appearing concurrently
      if (prev.some((t) => t.message === message)) {
        return prev;
      }
      generatedId = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newToast = { id: generatedId, message, type, title, duration };
      return [...prev, newToast];
    });
    return generatedId;
  }, []);

  const success = useCallback((message, title = 'Success', duration = 3500) => {
    return showToast({ message, type: 'success', title, duration });
  }, [showToast]);

  const error = useCallback((message, title = 'Error', duration = 4500) => {
    return showToast({ message, type: 'error', title, duration });
  }, [showToast]);

  const info = useCallback((message, title = 'Notice', duration = 3500) => {
    return showToast({ message, type: 'info', title, duration });
  }, [showToast]);

  const warning = useCallback((message, title = 'Warning', duration = 4000) => {
    return showToast({ message, type: 'warning', title, duration });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, success, error, info, warning }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

