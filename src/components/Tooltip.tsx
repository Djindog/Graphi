import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  placement?: Placement;
  maxWidth?: number;
  /** @deprecated use maxWidth */
  width?: number;
  triangle?: boolean;
}

export function Tooltip({ children, content, placement = 'top', maxWidth, width = 220, triangle = true }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const resolvedMaxWidth = maxWidth ?? width;
  const isShortContent = typeof content === 'string' && content.trim().split(/\s+/).length < 4;

  const show = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    let x = 0, y = 0;
    switch (placement) {
      case 'top':
        x = rect.left + rect.width / 2;
        y = rect.top;
        break;
      case 'bottom':
        x = rect.left + rect.width / 2;
        y = rect.bottom;
        break;
      case 'left':
        x = rect.left;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right;
        y = rect.top + rect.height / 2;
        break;
    }

    setPos({ x, y });
    setVisible(true);
  };

  const isHorizontal = placement === 'left' || placement === 'right';

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
            left: isHorizontal ? (placement === 'left' ? pos.x : pos.x + 9) : pos.x,
            top: isHorizontal ? pos.y : (placement === 'top' ? pos.y : pos.y + 9),
            transform: isHorizontal
              ? (placement === 'left' ? 'translate(calc(-100% - 9px), -50%)' : 'translateY(-50%)')
              : (placement === 'top' ? 'translate(-50%, calc(-100% - 9px))' : 'translateX(-50%)'),
            width: 'max-content',
            maxWidth: isShortContent ? 'none' : `min(${resolvedMaxWidth}px, calc(100vw - 32px))`,
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
            whiteSpace: isShortContent ? 'nowrap' : 'normal',
            wordBreak: isShortContent ? 'normal' : 'break-word',
          }}
        >
          {triangle && (
            <span
              style={{
                position: 'absolute',
                width: 0,
                height: 0,
                ...(placement === 'top' && {
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid #111827',
                }),
                ...(placement === 'bottom' && {
                  top: -4,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderBottom: '5px solid #111827',
                }),
                ...(placement === 'left' && {
                  right: -4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  borderTop: '5px solid transparent',
                  borderBottom: '5px solid transparent',
                  borderLeft: '5px solid #111827',
                }),
                ...(placement === 'right' && {
                  left: -4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  borderTop: '5px solid transparent',
                  borderBottom: '5px solid transparent',
                  borderRight: '5px solid #111827',
                }),
              }}
            />
          )}
          {content}
        </span>,
        document.body
      )}
    </span>
  );
}
