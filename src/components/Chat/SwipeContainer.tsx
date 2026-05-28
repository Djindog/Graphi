import { motion, useTransform } from 'framer-motion';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { MessageList } from './MessageList';
import type { Message } from '../../types';

interface Props {
  messages: Message[];
  isGenerating: boolean;
}

const PREVIEW_HEIGHT = 76;

export function SwipeContainer({ messages, isGenerating }: Props) {
  const {
    pullY, childRise, slideX,
    messageScale, messageOpacity, msgRadius,
    scrollElRef,
  } = useSwipeNavigation();

  // Preview rises from fully hidden (translateY = PREVIEW_HEIGHT) to peeking (translateY = 0)
  // Uses px — card starts below the container floor and slides up into view
  const previewY = useTransform(childRise, [0, 1], [PREVIEW_HEIGHT, 0]);
  const previewLabelOpacity = useTransform(childRise, [0.5, 1], [0, 1]);
  const gradientOpacity = useTransform(childRise, [0, 0.15], [0, 1]);

  return (
    // clip-path instead of overflow:hidden so absolutely-positioned children
    // are reliably clipped at the container boundary
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        // contain layout so the absolute preview card doesn't escape
        clipPath: 'inset(0)',
        userSelect: 'none',
      }}
    >
      {/* Preview card — absolutely pinned to the bottom, starts fully below the fold */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 12,
          right: 12,
          height: PREVIEW_HEIGHT,
          // translateY starts at PREVIEW_HEIGHT (hidden below) → 0 (fully visible)
          y: previewY,
          borderRadius: 14,
          background: '#EEF2FF',
          border: '1.5px solid #93C5FD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 0,
        }}
      >
        <motion.span
          style={{
            opacity: previewLabelOpacity,
            fontSize: 13,
            color: '#2563EB',
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          New node
        </motion.span>
      </motion.div>

      {/* Message area — sits above preview (zIndex 1), lifts and shrinks on overscroll */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          x: slideX,
          y: useTransform(pullY, v => -v),
          scale: messageScale,
          opacity: messageOpacity,
          originX: 0.5,
          originY: 1,
          borderRadius: msgRadius,
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Gradient mask fades in at the bottom edge as the preview starts rising */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 52,
            background: 'linear-gradient(to bottom, transparent, #ffffff)',
            pointerEvents: 'none',
            zIndex: 2,
            opacity: gradientOpacity,
          }}
        />
        <MessageList
          messages={messages}
          isGenerating={isGenerating}
          scrollRef={scrollElRef}
        />
      </motion.div>
    </div>
  );
}
