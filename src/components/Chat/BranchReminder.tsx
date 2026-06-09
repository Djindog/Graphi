import React from 'react';

type GuidancePillType = 'length' | 'drift' | 'noGuidance';

interface GuidancePillProps {
  type: GuidancePillType;
  isVisible: boolean;
  suggestedNodeTitle?: string;
  onMoveToNode?: (nodeId: string) => void;
  onDismiss?: () => void;
  suggestedNodeId?: string;
  onHoverNode?: (nodeId: string | null) => void;
}

export const BranchReminder: React.FC<GuidancePillProps> = ({
  type,
  isVisible,
  suggestedNodeTitle,
  onMoveToNode,
  onDismiss,
  suggestedNodeId,
  onHoverNode,
}) => {
  if (!isVisible) return null;

  const isDrift = type === 'drift';
  const isNoGuidance = type === 'noGuidance';
  const text = isDrift
    ? 'This seems off-topic. Move to '
    : isNoGuidance
    ? 'No guidance needed. Conversation is coherent.'
    : 'This thread is getting long. Consider branching.';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '0.75rem 1rem',
        gap: '1rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgb(254, 243, 199)',
          border: '1px solid rgb(217, 119, 6)',
          borderRadius: '9999px',
          padding: '0.75rem 1.25rem',
          boxShadow: '0 2px 8px rgba(217, 119, 6, 0.15)',
          gap: '0.5rem 1rem',
          animation: 'slideDown 0.3s ease-out',
          maxWidth: '100%',
        }}
      >
        <div
          style={{
            fontSize: '0.875rem',
            color: 'rgb(120, 53, 15)',
            lineHeight: '1.4',
            wordBreak: 'break-word',
          }}
        >
          {isDrift && suggestedNodeTitle ? (
            <>
              {text}
              <button
                onClick={() => suggestedNodeId && onMoveToNode?.(suggestedNodeId)}
                onMouseEnter={() => suggestedNodeId && onHoverNode?.(suggestedNodeId)}
                onMouseLeave={() => onHoverNode?.(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgb(120, 53, 15)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  fontSize: 'inherit',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                }}
              >
                {suggestedNodeTitle}
              </button>
              ?
            </>
          ) : (
            <span>{text}</span>
          )}
        </div>

        {!isDrift && !isNoGuidance && (
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
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
        )}

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
        `}</style>
      </div>
    </div>
  );
};
