// Graphi Polish Lab — ChatPane (refined hierarchy; bubbles vs document layout option)
const { useState: usePChState, useRef: usePChRef, useEffect: usePChEffect } = React;

const PGRIP = ['off', 'low', 'mid', 'high'];

function PContextTray({ items, activeIds, onToggle }) {
  const T = window.GTheme; const P = window.usePolish(); const acc = P.accent;
  if (!items.length) return null;
  return (
    <div style={{ borderBottom: `1px solid ${T.borderFaint}`, padding: '12px 16px 10px', background: T.surfaceFaint }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: T.ink400, margin: '0 0 9px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lineage · click to toggle</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {items.map(node => {
          const on = activeIds.has(node.id);
          return (
            <button key={node.id} onClick={() => onToggle(node.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13, maxWidth: 200,
                background: on ? acc.soft : T.surface, border: `1px solid ${on ? acc.base : T.border}`, color: on ? acc.strong : T.ink500, fontWeight: on ? 500 : 400, transition: 'all 0.12s' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: on ? acc.base : 'transparent', border: on ? 'none' : `1.5px solid ${T.ink300}` }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.title || 'Untitled'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PMessages({ messages, generating, doc }) {
  const T = window.GTheme; const P = window.usePolish(); const acc = P.accent;
  const d = window.densityTokens(P.density);
  const bottom = usePChRef(null);
  usePChEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages]);

  if (!messages.length && !generating) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <window.EmptyState icon="message-square-plus" title="Type to start this thread" body="Ask anything. Branch off this node any time to explore a tangent without losing your place." minimal={!P.emptyStates} accent={acc} />
    </div>;
  }
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: doc ? '22px 0' : '18px 16px' }}>
      <div style={{ maxWidth: doc ? 680 : '100%', margin: '0 auto', padding: doc ? '0 28px' : 0, display: 'flex', flexDirection: 'column', gap: d.msgGap }}>
        {messages.map(m => m.role === 'user' ? (
          <div key={m.id} style={{ display: 'flex', justifyContent: doc ? 'flex-start' : 'flex-end' }}>
            {doc && <div style={{ width: 28, height: 28, borderRadius: '50%', background: T.ink900, color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12 }}>A</div>}
            <div style={{ maxWidth: doc ? '100%' : '82%', padding: doc ? '2px 0' : '10px 15px', borderRadius: 16, fontSize: 15, lineHeight: 1.6, wordBreak: 'break-word', background: doc ? 'transparent' : T.borderFaint, color: T.ink900, fontWeight: doc ? 500 : 400 }}>{m.content}</div>
          </div>
        ) : (
          <div key={m.id} style={{ display: 'flex' }}>
            {doc && <div style={{ width: 28, height: 28, borderRadius: '50%', background: acc.base, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12 }}><GIcon name="git-fork" size={14} stroke={2.2} color="#fff" /></div>}
            <div style={{ maxWidth: doc ? '100%' : '94%', fontSize: 15, lineHeight: 1.68, color: T.ink900, wordBreak: 'break-word' }}>{m.content || (generating ? <span style={{ opacity: 0.4 }}>▍</span> : '')}</div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
    </div>
  );
}

function PComposer({ value, onChange, onSend, generating, onStop, gripLevel, onGrip, doc }) {
  const T = window.GTheme; const P = window.usePolish(); const acc = P.accent;
  const [focus, setFocus] = usePChState(false);
  const canSend = !generating && !!value.trim();
  return (
    <div style={{ borderTop: `1px solid ${T.borderFaint}`, padding: doc ? '14px 28px 16px' : '14px 16px', background: T.surface }}>
      <div style={{ maxWidth: doc ? 680 : '100%', margin: '0 auto' }}>
        <div style={{ border: `1.5px solid ${focus ? acc.base : T.border}`, borderRadius: 14, background: T.surface, padding: '4px 4px 4px 0', boxShadow: focus ? `0 0 0 3px ${acc.soft}` : '0 1px 2px rgba(17,24,39,0.04)', transition: 'border-color 0.15s, box-shadow 0.15s' }}>
          <textarea value={value} onChange={e => onChange(e.target.value)} placeholder="How can I help you?" rows={2} disabled={generating}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
            style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', padding: '10px 14px 4px', fontSize: 15, color: T.ink900, outline: 'none', resize: 'none', lineHeight: 1.5, fontFamily: T.font }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px 2px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 12, color: T.ink400, marginRight: 4, display: 'flex', alignItems: 'center', gap: 4 }}><GIcon name="crosshair" size={13} stroke={2} color={T.ink400} />Grip</span>
              {PGRIP.map(l => (
                <button key={l} onClick={() => onGrip(l)}
                  style={{ padding: '4px 9px', fontSize: 12, borderRadius: 7, border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                    background: gripLevel === l ? T.ink900 : 'transparent', color: gripLevel === l ? '#fff' : T.ink400, fontWeight: gripLevel === l ? 500 : 400, transition: 'all 0.1s' }}>{l}</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {generating && (
                <button onClick={onStop} title="Stop" style={{ width: 34, height: 34, borderRadius: '50%', border: `1.5px solid ${T.border}`, background: '#fff', color: T.ink500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3" /></svg>
                </button>
              )}
              <button onClick={canSend ? onSend : undefined} disabled={!canSend && !generating} title={generating ? 'Generating…' : 'Send'}
                style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: canSend ? T.ink900 : T.border, color: canSend ? '#fff' : T.ink400, cursor: canSend ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
                {generating
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'gspin 0.75s linear infinite' }}><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                  : <GIcon name="arrow-up" size={17} stroke={2.4} color={canSend ? '#fff' : T.ink400} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PolishChat({ width, node, messages, generating, input, onInput, onSend, onStop, gripLevel, onGrip, contextItems, contextActive, onToggleContext }) {
  const T = window.GTheme; const P = window.usePolish(); const acc = P.accent;
  const doc = P.chatLayout === 'document';
  if (!node) {
    return <div style={{ width, background: T.surface, borderLeft: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexShrink: 0 }}>
      <window.EmptyState icon="mouse-pointer-click" title="Select a node" body="Click any node on the canvas to open its thread." minimal={!P.emptyStates} accent={acc} /></div>;
  }
  return (
    <div style={{ width, background: T.surface, borderLeft: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
      <div style={{ padding: '15px 16px 14px', borderBottom: `1px solid ${T.borderFaint}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: acc.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <GIcon name={node.parentId ? 'git-branch' : 'circle-dot'} size={15} stroke={2} color={acc.base} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: T.ink900, margin: 0, letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.title || 'Untitled'}</p>
          <p style={{ fontSize: 12, color: T.ink400, margin: '2px 0 0' }}>{node.parentId ? 'Branch thread' : 'Root thread'}</p>
        </div>
      </div>
      <PContextTray items={contextItems} activeIds={contextActive} onToggle={onToggleContext} />
      <PMessages messages={messages} generating={generating} doc={doc} />
      <PComposer value={input} onChange={onInput} onSend={onSend} generating={generating} onStop={onStop} gripLevel={gripLevel} onGrip={onGrip} doc={doc} />
    </div>
  );
}

window.PolishChat = PolishChat;
