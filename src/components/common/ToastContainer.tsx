import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import type { ToastItem } from '../../types/git';

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast-item ${toast.type}`}>
          <div className="toast-icon">
            {toast.type === "success" && <CheckCircle2 size={15} />}
            {toast.type === "error" && <AlertCircle size={15} />}
            {toast.type === "info" && <Info size={15} />}
            {toast.type === "warning" && <AlertTriangle size={15} />}
          </div>
          <div className="toast-content">
            <span className="toast-title">{toast.title}</span>
            {toast.message && <span className="toast-message">{toast.message}</span>}
          </div>
          <button
            className="toast-close-btn"
            onClick={() => onRemove(toast.id)}
            type="button"
            title="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
