import type { GripLevel } from '../../types';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  isGenerating: boolean;
  gripLevel: GripLevel;
  onGripChange: (level: GripLevel) => void;
}

const GRIP_LEVELS: GripLevel[] = ['off', 'low', 'mid', 'high'];

export function ChatInput({ value, onChange, onSend, isGenerating, gripLevel, onGripChange }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  return (
    <div style={{ borderTop: '1px solid #F3F4F6', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fff' }}>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message… (Enter to send)"
        rows={3}
        disabled={isGenerating}
        style={{
          width: '100%', background: '#F9FAFB', border: '1.5px solid #E5E7EB',
          borderRadius: 12, padding: '10px 12px', fontSize: 14, color: '#111827',
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

        <button
          onClick={onSend}
          disabled={isGenerating || !value.trim()}
          style={{
            background: '#111827', color: '#fff', border: 'none', borderRadius: 10,
            padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            opacity: (isGenerating || !value.trim()) ? 0.35 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {isGenerating ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
