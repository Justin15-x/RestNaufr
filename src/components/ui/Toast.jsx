import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000;

let toastId = 0;
const toasts = [];
const listeners = [];

function genId() {
  toastId = (toastId + 1) % Number.MAX_SAFE_INTEGER;
  return toastId.toString();
}

function notifyListeners() {
  listeners.forEach(listener => listener([...toasts]));
}

export function toast({ title, description, variant = 'default', duration = TOAST_REMOVE_DELAY }) {
  const id = genId();
  const newToast = {
    id,
    title,
    description,
    variant,
    duration
  };
  toasts.push(newToast);
  notifyListeners();

  if (duration !== Infinity) {
    setTimeout(() => {
      dismiss(id);
    }, duration);
  }

  return id;
}

export function dismiss(id) {
  const index = toasts.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.splice(index, 1);
    notifyListeners();
  }
}

export function useToast() {
  const [state, setState] = useState([...toasts]);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss
  };
}

const variantStyles = {
  default: 'bg-gray-900 text-white',
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-600 text-white',
  info: 'bg-blue-600 text-white'
};

const variantIcons = {
  default: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

function ToastItem({ toast, onDismiss }) {
  return (
    <div
      className={`toast ${variantStyles[toast.variant]} flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg animate-slide-in`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{variantIcons[toast.variant]}</div>
      <div className="flex-1 min-w-0">
        {toast.title && <p className="font-medium">{toast.title}</p>}
        {toast.description && <p className="text-sm opacity-90 mt-0.5">{toast.description}</p>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
        aria-label="Cerrar"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function Toaster() {
  const { toast, dismiss, ...toastsList } = useToast();
  const visibleToasts = Object.values(toastsList).slice(-TOAST_LIMIT);

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite">
      {visibleToasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={dismiss} />
        </div>
      ))}
    </div>,
    document.body
  );
}

// Funciones de conveniencia
export const toastSuccess = (title, description) => toast({ title, description, variant: 'success' });
export const toastError = (title, description) => toast({ title, description, variant: 'error' });
export const toastWarning = (title, description) => toast({ title, description, variant: 'warning' });
export const toastInfo = (title, description) => toast({ title, description, variant: 'info' });