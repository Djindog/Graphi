import { useState, forwardRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { Tooltip } from '../Tooltip';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  guidanceEnabled?: boolean;
  onGuidanceChange?: (enabled: boolean) => void;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
}

const StopIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="3" />
  </svg>
);

const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    style={{ animation: 'gspin 0.75s linear infinite' }}>
    <path d="M12 2a10 10 0 0 1 10 10" />
  </svg>
);

export const ChatInput = forwardRef<HTMLTextAreaElement, Props>(
  ({ value, onChange, onSend, onStop, isGenerating, guidanceEnabled = true, onGuidanceChange, onInputFocus, onInputBlur }, ref) => {
    const [focused, setFocused] = useState(false);
    const canSend = !isGenerating && !!value.trim();

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
    };

    return (
    <div data-tutorial="chat-input-area" style={{ padding: '4px 12px 16px', background: 'transparent' }}>
      {/* Unified composer container — floating card */}
      <div style={{
        border: `1.5px solid ${focused ? '#2563EB' : '#E5E7EB'}`,
        borderRadius: 14,
        background: '#fff',
        boxShadow: focused
          ? '0 0 0 3px #EFF6FF, 0 4px 20px rgba(0,0,0,0.10)'
          : '0 2px 12px rgba(17,24,39,0.09), 0 1px 3px rgba(17,24,39,0.05)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        padding: '4px 4px 4px 0',
      }}>
        <textarea
          ref={ref}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { setFocused(true); onInputFocus?.(); }}
          onBlur={() => { setFocused(false); onInputBlur?.(); }}
          placeholder="How can I help you?"
          rows={2}
          disabled={isGenerating}
          style={{
            width: '100%', background: 'transparent', border: 'none',
            padding: '10px 14px 4px', fontSize: 15, color: '#111827',
            outline: 'none', resize: 'none', lineHeight: 1.5,
            fontFamily: 'inherit',
          }}
        />

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px 2px 14px' }}>
          {/* Guidance toggle */}
          <Tooltip
            placement="top"
            width={220}
            content={guidanceEnabled ? 'Guidance is on. Context search and branch/drift hints are enabled.' : 'Guidance is off. No context search or hints.'}
          >
            <button
              onClick={() => onGuidanceChange?.(!guidanceEnabled)}
              style={{
                padding: '4px 11px', fontSize: 12, borderRadius: 7, border: 'none', cursor: 'pointer',
                background: guidanceEnabled ? '#111827' : 'transparent',
                color: guidanceEnabled ? '#fff' : '#9CA3AF',
                fontWeight: guidanceEnabled ? 500 : 400,
                transition: 'all 0.1s', fontFamily: 'inherit',
              }}
            >
              {guidanceEnabled ? 'Guidance on' : 'Guidance off'}
            </button>
          </Tooltip>

          {/* Send / Stop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isGenerating && (
              <button
                onClick={onStop}
                title="Stop generation"
                style={{
                  width: 34, height: 34, borderRadius: '50%', border: '1.5px solid #E5E7EB',
                  background: '#fff', color: '#6B7280', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#111827'; (e.currentTarget as HTMLButtonElement).style.color = '#111827'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; }}
              >
                <StopIcon />
              </button>
            )}
            <button
              onClick={canSend ? onSend : undefined}
              disabled={!canSend && !isGenerating}
              title={isGenerating ? 'Generating…' : 'Send'}
              style={{
                width: 34, height: 34, borderRadius: '50%', border: 'none',
                background: canSend ? '#111827' : '#E5E7EB',
                color: canSend ? '#fff' : '#9CA3AF',
                cursor: canSend ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.15s',
              }}
            >
              {isGenerating ? <Spinner /> : <ArrowUp size={17} strokeWidth={2.4} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
);
