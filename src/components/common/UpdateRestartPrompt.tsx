import React from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

interface UpdateRestartPromptProps {
  isOpen: boolean;
  version?: string | null;
  onRestart: () => void;
  onDismiss: () => void;
  onOpenDetails?: () => void;
}

const UpdateRestartPrompt: React.FC<UpdateRestartPromptProps> = ({
  isOpen,
  version,
  onRestart,
  onDismiss,
  onOpenDetails,
}) => {
  if (!isOpen) return null;

  return (
    <aside
      className="update-restart-prompt"
      role="status"
      aria-live="polite"
      aria-label="Application update ready"
    >
      <div className="update-prompt-glow" />
      <div className="update-prompt-content">
        <div className="update-prompt-header">
          <div className="update-prompt-badge-icon">
            <Sparkles size={16} />
          </div>
          <div className="update-prompt-titles">
            <div className="update-prompt-title">
              <span>Update Ready to Apply</span>
              {version && <span className="update-prompt-version">v{version}</span>}
            </div>
            <p className="update-prompt-description">
              A new version was downloaded in the background. Restart Stagger now to finish updating.
            </p>
          </div>
          <button
            type="button"
            className="update-prompt-close-btn"
            onClick={onDismiss}
            title="Dismiss notification (update remains ready)"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>

        <div className="update-prompt-actions">
          {onOpenDetails && (
            <button
              type="button"
              className="update-prompt-btn-secondary"
              onClick={onOpenDetails}
            >
              View Notes
            </button>
          )}
          <button
            type="button"
            className="update-prompt-btn-secondary"
            onClick={onDismiss}
          >
            Later
          </button>
          <button
            type="button"
            className="update-prompt-btn-primary"
            onClick={onRestart}
          >
            <RefreshCw size={13} />
            <span>Restart to Update</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default UpdateRestartPrompt;
