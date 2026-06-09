// Graphi UI Kit — shared design tokens (plain JS global)
window.GTheme = {
  // surfaces
  appBg: '#F5F6F8', canvasBg: '#F0F2F5', surface: '#FFFFFF',
  surfaceSoft: '#F9FAFB', surfaceFaint: '#FAFAFA',
  // ink
  ink900: '#111827', ink700: '#374151', ink500: '#6B7280',
  ink400: '#9CA3AF', ink300: '#D1D5DB',
  // borders
  border: '#E5E7EB', borderFaint: '#F3F4F6',
  // blue accent
  blue700: '#1D4ED8', blue600: '#2563EB', blue300: '#93C5FD',
  blue100: '#DBEAFE', blue50: '#EFF6FF', indigo50: '#EEF2FF',
  // semantic
  danger600: '#EF4444', danger300: '#FCA5A5', danger50: '#FEF2F2',
  amber500: '#F59E0B',
  // type
  font: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  mono: "'SFMono-Regular', 'Consolas', 'Menlo', monospace",
  // shadows
  shadowToolbar: '0 1px 4px rgba(0,0,0,0.06)',
  shadowMenu: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
  shadowToast: '0 4px 16px rgba(0,0,0,0.12)',
  shadowModal: '0 24px 60px rgba(0,0,0,0.18)',
  shadowCard: '0 1px 2px rgba(0,0,0,0.04)',
};

// Lucide icon as inline SVG string -> React via dangerouslySetInnerHTML
window.GIcon = function GIcon({ name, size = 13, stroke = 2, color = 'currentColor', style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = '';
      const i = document.createElement('i');
      i.setAttribute('data-lucide', name);
      ref.current.appendChild(i);
      window.lucide.createIcons({
        attrs: { width: size, height: size, 'stroke-width': stroke, stroke: color },
      });
    }
  }, [name, size, stroke, color]);
  return React.createElement('span', {
    ref,
    style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style },
  });
};
