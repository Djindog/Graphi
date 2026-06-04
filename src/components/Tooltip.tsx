import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

type Placement = 'top' | 'bottom';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  placement?: Placement;
  width?: number;
}

export function Tooltip({ children, content, placement = 'top', width = 220 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const isTop = placement === 'top';

  const show = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      x: rect.left + rect.width / 2,
      y: isTop ? rect.top : rect.bottom,
    });
    setVisible(true);
  };

  return (
    <span
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={() => setVisible(false)}
      onFocus={show}
      onBlur={() => setVisible(false)}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {children}
      {visible && createPortal(
        <span
          role="tooltip"
          style={{
            position: 'fixed',
            left: pos.x,
            top: isTop ? pos.y : pos.y + 9,
            transform: isTop ? 'translate(-50%, calc(-100% - 9px))' : 'translateX(-50%)',
            width,
            maxWidth: 'min(280px, calc(100vw - 32px))',
            background: '#111827',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.45,
            padding: '7px 10px',
            borderRadius: 7,
            textAlign: 'left',
            pointerEvents: 'none',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            whiteSpace: 'normal',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              ...(isTop ? {
                top: '100%',
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '5px solid #111827',
              } : {
                top: -4,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderBottom: '5px solid #111827',
              }),
            }}
          />
          {content}
        </span>,
        document.body
      )}
    </span>
  );
}
