import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  useEffect(() => {
    const onToast = (event) => {
      const payload = event.detail ?? {};
      if (payload.message) showToast(payload.message, payload.type);
    };
    window.addEventListener('scout-toast', onToast);
    return () => window.removeEventListener('scout-toast', onToast);
  }, [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 20,
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              minWidth: 220,
              maxWidth: 340,
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              padding: '10px 12px',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
            }}
          >
            <strong style={{ textTransform: 'capitalize', marginRight: 6 }}>{toast.type}</strong>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
