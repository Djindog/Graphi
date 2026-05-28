import type { GripLevel } from '../../types';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  gripLevel: GripLevel;
  onGripChange: (level: GripLevel) => void;
}

const GRIP_LEVELS: GripLevel[] = ['off', 'low', 'mid', 'high'];

const ArrowUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const StopIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    style={{ animation: 'spin 0.75s linear infinite' }}>
    <path d="M12 2a10 10 0 0 1 10 10" />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </svg>
);

export function ChatInput({ value, onChange, onSend, onStop, isGenerating, gripLevel, onGripChange }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const canSend = !isGenerating && !!value.trim();

  return (
    <div style={{ borderTop: '1px solid #F3F4F6', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fff' }}>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="How can I help you?"
        rows={3}
        disabled={isGenerating}
        style={{
          width: '100%', background: '#F9FAFB', border: '1.5px solid #E5E7EB',
          borderRadius: 12, padding: '10px 12px', fontSize: 15, color: '#111827',
          outline: 'none', resize: 'none', lineHeight: 1.5,
          fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#2563EB'; }}
        onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#E5E7EB'; }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 12, color: '#9CA3AF', marginRight: 2 }}>Grip</span>
          {GRIP_LEVELS.map(level => (
            <button
              key={level}
              onClick={() => onGripChange(level)}
              style={{
                padding: '3px 8px', fontSize: 12, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: gripLevel === level ? '#111827' : 'transparent',
                color: gripLevel === level ? '#fff' : '#9CA3AF',
                fontWeight: gripLevel === level ? 500 : 400,
                transition: 'all 0.1s',
                textTransform: 'capitalize',
              }}
            >
              {level}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isGenerating && (
            <button
              onClick={onStop}
              title="Stop generation"
              style={{
                width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #E5E7EB',
                background: '#fff', color: '#6B7280', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color 0.15s, color 0.15s',
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
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              background: canSend ? '#111827' : '#E5E7EB',
              color: canSend ? '#fff' : '#9CA3AF',
              cursor: canSend ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
              flexShrink: 0,
            }}
          >
            {isGenerating ? <Spinner /> : <ArrowUpIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}
