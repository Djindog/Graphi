import React from 'react';
import { X } from 'lucide-react';

interface BranchReminderProps {
  isVisible: boolean;
  messageCount: number;
  onClose: () => void;
  onDismiss: () => void;
}

export const BranchReminder: React.FC<BranchReminderProps> = ({
  isVisible,
  messageCount,
  onClose,
  onDismiss,
}) => {
  if (!isVisible || messageCount < 15) return null;

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 10,
        margin: '0.75rem auto',
        width: 'fit-content',
        maxWidth: 'calc(100% - 2rem)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgb(254, 243, 199)',
        border: '1px solid rgb(217, 119, 6)',
        borderRadius: '9999px',
        padding: '0.75rem 1.25rem',
        boxShadow: '0 2px 8px rgba(217, 119, 6, 0.15)',
        gap: '1rem',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: '1.125rem',
            flexShrink: 0,
            marginRight: '0.25rem',
          }}
        >
          ⚠️
        </span>
        <p
          style={{
            margin: 0,
            fontSize: '0.875rem',
            color: 'rgb(120, 53, 15)',
            lineHeight: '1.4',
            whiteSpace: 'nowrap',
          }}
        >
          This thread is getting long. Consider branching.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgb(120, 53, 15)',
            cursor: 'pointer',
            padding: '0 0.25rem',
            fontSize: '1.25rem',
            lineHeight: 1,
            opacity: 0.8,
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
          aria-label="Close"
        >
          ×
        </button>
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgb(120, 53, 15)',
            cursor: 'pointer',
            padding: '0.25rem 0.5rem',
            fontSize: '0.875rem',
            opacity: 0.8,
            transition: 'opacity 0.2s ease',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.8';
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          Don't show again
        </button>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
};
