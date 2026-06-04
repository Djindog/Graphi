import { useState } from 'react';

type Placement = 'top' | 'bottom';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  placement?: Placement;
  width?: number;
}

export function Tooltip({ children, content, placement = 'top', width = 220 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const isTop = placement === 'top';

  return (
    <span
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            left: '50%',
            top: isTop ? undefined : 'calc(100% + 9px)',
            bottom: isTop ? 'calc(100% + 9px)' : undefined,
            transform: 'translateX(-50%)',
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
            zIndex: 3000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            whiteSpace: 'normal',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: isTop ? '100%' : -4,
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: isTop ? '5px solid #111827' : undefined,
              borderBottom: isTop ? undefined : '5px solid #111827',
            }}
          />
          {content}
        </span>
      )}
    </span>
  );
}
