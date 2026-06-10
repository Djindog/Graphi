import { useState, useEffect, useRef } from 'react';
import { useGripStore } from '../stores/gripStore';
import type { GripLevel } from '../types';

interface Props {
  onSave: (key: string) => Promise<void>;
  onClose?: () => void;
  existingKey?: string;
  referenceDetectionEnabled?: boolean;
  onReferenceDetectionChange?: (enabled: boolean) => void;
  driftDetectionEnabled?: boolean;
  onDriftDetectionChange?: (enabled: boolean) => void;
  gripLevel?: GripLevel;
  onGripLevelChange?: (level: GripLevel) => void;
}

const GRIP_LEVELS: GripLevel[] = ['off', 'low', 'mid', 'high'];

const GRIP_LABELS: Record<GripLevel, string> = {
  off: 'Off',
  low: 'Broad',
  mid: 'Balanced',
  high: 'Strict',
};

const GRIP_DESCRIPTIONS: Record<GripLevel, string> = {
  off: 'Only the current thread and selected lineage context are used. No semantic search is added.',
  low: 'Pulls up to 15 loosely related nodes into the context suggestions.',
  mid: 'Pulls up to 8 related nodes with a moderate similarity threshold.',
  high: 'Pulls up to 3 highly similar nodes, keeping context narrow.',
};

export function ApiKeyModal({ onSave, onClose, existingKey, referenceDetectionEnabled = true, onReferenceDetectionChange, driftDetectionEnabled = true, onDriftDetectionChange, gripLevel: externalGripLevel, onGripLevelChange }: Props) {
  const [tab, setTab] = useState<'api' | 'dev' | 'guidance'>('api');
  const { gripLevel: storeGripLevel, setGripLevel: storeSetGripLevel } = useGripStore();
  const gripLevel = externalGripLevel ?? storeGripLevel;
  const setGripLevel = onGripLevelChange ?? storeSetGripLevel;
  const [key, setKey] = useState(existingKey ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(() => {
    return localStorage.getItem('graphi_dev_mode') === 'true';
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, [tab]);

  const submit = async () => {
    const trimmed = key.trim();
    if (!trimmed.startsWith('gsk_')) {
      setError('Groq API keys start with "gsk_"');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save key');
    } finally {
      setSaving(false);
    }
  };

  const toggleDevMode = () => {
    const newValue = !devMode;
    setDevMode(newValue);
    localStorage.setItem('graphi_dev_mode', newValue ? 'true' : 'false');
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          padding: '28px 28px 24px',
          width: 440, maxWidth: 'calc(100vw - 32px)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0, letterSpacing: '-0.3px' }}>
              Settings
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18, lineHeight: 1, padding: '2px 4px', marginLeft: 12 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; }}
            >✕</button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: 20, marginBottom: 20, borderBottom: '1px solid #E5E7EB' }}>
          <button
            onClick={() => setTab('api')}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: tab === 'api' ? 600 : 400,
              color: tab === 'api' ? '#111827' : '#6B7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: tab === 'api' ? '2px solid #2563EB' : 'none',
              marginBottom: '-1px',
              transition: 'color 0.15s',
            }}
          >
            API Key
          </button>
          <button
            onClick={() => setTab('guidance')}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: tab === 'guidance' ? 600 : 400,
              color: tab === 'guidance' ? '#111827' : '#6B7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: tab === 'guidance' ? '2px solid #2563EB' : 'none',
              marginBottom: '-1px',
              transition: 'color 0.15s',
            }}
          >
            Guidance
          </button>
          <button
            onClick={() => setTab('dev')}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: tab === 'dev' ? 600 : 400,
              color: tab === 'dev' ? '#111827' : '#6B7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: tab === 'dev' ? '2px solid #2563EB' : 'none',
              marginBottom: '-1px',
              transition: 'color 0.15s',
            }}
          >
            Developer
          </button>
        </div>

        {/* API Key Tab */}
        {tab === 'api' && (
          <div>
            <div style={{ marginTop: 0 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Groq API key
              </label>
              <input
                ref={inputRef}
                type="password"
                value={key}
                onChange={e => { setKey(e.target.value); setError(null); }}
                onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape' && onClose) onClose(); }}
                placeholder="gsk_..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#F9FAFB', border: `1.5px solid ${error ? '#FCA5A5' : '#E5E7EB'}`,
                  borderRadius: 10, padding: '10px 12px', fontSize: 14,
                  color: '#111827', outline: 'none', fontFamily: 'monospace',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { if (!error) (e.target as HTMLInputElement).style.borderColor = '#2563EB'; }}
                onBlur={e => { if (!error) (e.target as HTMLInputElement).style.borderColor = '#E5E7EB'; }}
              />
              {error && (
                <p style={{ fontSize: 12, color: '#EF4444', marginTop: 6, marginBottom: 0 }}>{error}</p>
              )}
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8, marginBottom: 0 }}>
                Get a free key at{' '}
                <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer"
                  style={{ color: '#2563EB', textDecoration: 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
                >console.groq.com/keys</a>
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
              {onClose && (
                <button
                  onClick={onClose}
                  style={{
                    padding: '9px 18px', fontSize: 14, borderRadius: 10, border: '1px solid #E5E7EB',
                    background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 500,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
                >Close</button>
              )}
              <button
                onClick={submit}
                disabled={saving || !key.trim()}
                style={{
                  padding: '9px 20px', fontSize: 14, borderRadius: 10, border: 'none',
                  background: '#111827', color: '#fff',
                  cursor: saving || !key.trim() ? 'default' : 'pointer',
                  fontWeight: 500, opacity: saving || !key.trim() ? 0.5 : 1,
                  transition: 'opacity 0.1s',
                }}
              >{saving ? '…' : 'Save'}</button>
            </div>
          </div>
        )}

        {/* Guidance Tab */}
        {tab === 'guidance' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 300px)', maxHeight: 600 }}>
            <div style={{ marginTop: 0, overflowY: 'auto', paddingRight: 8, flex: 1 }}>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 16px' }}>
                Control which background intelligence features are enabled while you type.
              </p>

              {/* Feature Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {/* Reference Detection Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', margin: 0, display: 'block' }}>
                      Reference Detection
                    </label>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0', lineHeight: 1.4 }}>
                      Detect and highlight related nodes in your conversation
                    </p>
                  </div>
                  <button
                    onClick={() => onReferenceDetectionChange?.(!referenceDetectionEnabled)}
                    style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: referenceDetectionEnabled ? '#2563EB' : '#E5E7EB',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      padding: 2,
                      transition: 'background 0.2s',
                      flexShrink: 0,
                      marginLeft: 12,
                    }}
                    onMouseEnter={e => {
                      if (referenceDetectionEnabled) {
                        (e.currentTarget as HTMLButtonElement).style.background = '#1D4ED8';
                      } else {
                        (e.currentTarget as HTMLButtonElement).style.background = '#D1D5DB';
                      }
                    }}
                    onMouseLeave={e => {
                      if (referenceDetectionEnabled) {
                        (e.currentTarget as HTMLButtonElement).style.background = '#2563EB';
                      } else {
                        (e.currentTarget as HTMLButtonElement).style.background = '#E5E7EB';
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 20, height: 20, borderRadius: 10,
                        background: '#fff',
                        position: 'absolute',
                        transition: 'left 0.2s',
                        left: referenceDetectionEnabled ? 22 : 2,
                        top: 2,
                      }}
                    />
                  </button>
                </div>

                {/* Drift Detection Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', margin: 0, display: 'block' }}>
                      Drift Detection
                    </label>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0', lineHeight: 1.4 }}>
                      Detect off-topic shifts and suggest appropriate nodes
                    </p>
                  </div>
                  <button
                    onClick={() => onDriftDetectionChange?.(!driftDetectionEnabled)}
                    style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: driftDetectionEnabled ? '#2563EB' : '#E5E7EB',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      padding: 2,
                      transition: 'background 0.2s',
                      flexShrink: 0,
                      marginLeft: 12,
                    }}
                    onMouseEnter={e => {
                      if (driftDetectionEnabled) {
                        (e.currentTarget as HTMLButtonElement).style.background = '#1D4ED8';
                      } else {
                        (e.currentTarget as HTMLButtonElement).style.background = '#D1D5DB';
                      }
                    }}
                    onMouseLeave={e => {
                      if (driftDetectionEnabled) {
                        (e.currentTarget as HTMLButtonElement).style.background = '#2563EB';
                      } else {
                        (e.currentTarget as HTMLButtonElement).style.background = '#E5E7EB';
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 20, height: 20, borderRadius: 10,
                        background: '#fff',
                        position: 'absolute',
                        transition: 'left 0.2s',
                        left: driftDetectionEnabled ? 22 : 2,
                        top: 2,
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* Grip Level Settings */}
              <p style={{ fontSize: 12, fontWeight: 500, color: '#374151', margin: '0 0 12px' }}>
                Context Search Sensitivity
              </p>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 12px' }}>
                When reference detection is on, choose how many related nodes to suggest.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {GRIP_LEVELS.map(level => (
                  <label
                    key={level}
                    onClick={() => setGripLevel(level)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px 12px',
                      background: gripLevel === level ? '#EFF6FF' : '#F9FAFB',
                      borderRadius: 10,
                      border: `1.5px solid ${gripLevel === level ? '#2563EB' : '#E5E7EB'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (gripLevel !== level) {
                        (e.currentTarget as HTMLLabelElement).style.borderColor = '#D1D5DB';
                        (e.currentTarget as HTMLLabelElement).style.background = '#F3F4F6';
                      }
                    }}
                    onMouseLeave={e => {
                      if (gripLevel !== level) {
                        (e.currentTarget as HTMLLabelElement).style.borderColor = '#E5E7EB';
                        (e.currentTarget as HTMLLabelElement).style.background = '#F9FAFB';
                      }
                    }}
                  >
                    {/* Radio button */}
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: `2px solid ${gripLevel === level ? '#2563EB' : '#D1D5DB'}`,
                        flexShrink: 0,
                        marginTop: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {gripLevel === level && (
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#2563EB',
                          }}
                        />
                      )}
                    </div>

                    {/* Label and description */}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: '0 0 4px' }}>
                        {GRIP_LABELS[level]}
                      </p>
                      <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.4 }}>
                        {GRIP_DESCRIPTIONS[level]}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
              {onClose && (
                <button
                  onClick={onClose}
                  style={{
                    padding: '9px 18px', fontSize: 14, borderRadius: 10, border: '1px solid #E5E7EB',
                    background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 500,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
                >Close</button>
              )}
            </div>
          </div>
        )}

        {/* Developer Tab */}
        {tab === 'dev' && (
          <div>
            <div style={{ marginTop: 0 }}>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 16px' }}>
                Enable developer mode to access testing tools and features.
              </p>

              {/* Developer Mode Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', margin: 0 }}>
                  Developer Mode
                </label>
                <button
                  onClick={toggleDevMode}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: devMode ? '#2563EB' : '#E5E7EB',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: 2,
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (devMode) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#1D4ED8';
                    }
                  }}
                  onMouseLeave={e => {
                    if (devMode) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#2563EB';
                    }
                  }}
                >
                  <div
                    style={{
                      width: 20, height: 20, borderRadius: 10,
                      background: '#fff',
                      position: 'absolute',
                      transition: 'left 0.2s',
                      left: devMode ? 22 : 2,
                      top: 2,
                    }}
                  />
                </button>
              </div>

              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 12, marginBottom: 0 }}>
                {devMode
                  ? '✓ Developer mode is enabled. Test button and dev features are now visible.'
                  : 'Turn on to see dev-only features like the reminder test button.'}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
              {onClose && (
                <button
                  onClick={onClose}
                  style={{
                    padding: '9px 18px', fontSize: 14, borderRadius: 10, border: '1px solid #E5E7EB',
                    background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 500,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
                >Close</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
