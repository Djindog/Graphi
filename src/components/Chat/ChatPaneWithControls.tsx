import { useCallback, useRef, useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useDagStore } from '../../stores/dagStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { Tooltip } from '../Tooltip';
import { ChatPane } from './ChatPane';
import type Groq from 'groq-sdk';

interface SidePopupState {
  type: 'left' | 'right' | null;
  y: number;
  isEdge: boolean;
}

export function ChatPaneWithControls({ width = 320, groqClient, canvasHidden = false }: { width?: number; groqClient: InstanceType<typeof Groq> | null; canvasHidden?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sidePopup, setSidePopup] = useState<SidePopupState>({ type: null, y: 0, isEdge: false });

  const { currentNodeId, setCurrentNode } = useChatStore();
  const { getPrevSibling, getNextSibling, addNode, nodes, pushNavigationStack, popNavigationStack, getFirstChild } = useDagStore();
  const setNavigationTrigger = useCanvasStore(s => s.setNavigationTrigger);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!currentNodeId) return;

    if (e.ctrlKey || e.metaKey) {
      const currentNode = nodes.find(n => n.id === currentNodeId);
      if (!currentNode) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (e.shiftKey) {
          // Ctrl+Shift+Down: Create new child
          (async () => {
            const newChild = await addNode(null, currentNodeId, currentNode.projectId);
            setNavigationTrigger('button');
            await setCurrentNode(newChild.id);
          })();
        } else {
          // Ctrl+Down: Pop from stack, or go to first child if stack is empty
          const nodesToReturn = popNavigationStack();
          setNavigationTrigger('arrow');
          if (nodesToReturn) {
            setCurrentNode(nodesToReturn);
          } else {
            const firstChild = getFirstChild(currentNodeId);
            if (firstChild) {
              setCurrentNode(firstChild.id);
            }
          }
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = getPrevSibling(currentNodeId);
        setNavigationTrigger('arrow');
        if (prev) {
          setCurrentNode(prev.id);
        } else {
          // Create new sibling
          (async () => {
            const newSibling = await addNode(null, currentNode.parentId, currentNode.projectId);
            await setCurrentNode(newSibling.id);
          })();
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = getNextSibling(currentNodeId);
        setNavigationTrigger('arrow');
        if (next) {
          setCurrentNode(next.id);
        } else {
          // Create new sibling
          (async () => {
            const newSibling = await addNode(null, currentNode.parentId, currentNode.projectId);
            await setCurrentNode(newSibling.id);
          })();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Ctrl+Up: Push current node to stack, then navigate to parent
        if (currentNode.parentId) {
          setNavigationTrigger('arrow');
          pushNavigationStack(currentNodeId);
          setCurrentNode(currentNode.parentId);
        }
      }
    }
  }, [currentNodeId, nodes, getPrevSibling, getNextSibling, addNode, pushNavigationStack, popNavigationStack, getFirstChild, setCurrentNode, setNavigationTrigger]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Mouse tracking for side popup buttons
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const container = containerRef.current;
    if (!container || !currentNodeId) {
      setSidePopup({ type: null, y: 0, isEdge: false });
      return;
    }

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const containerHeight = rect.height;
    const chatInputHeight = 70;

    // Don't show when over chat input
    if (y > containerHeight - chatInputHeight) {
      setSidePopup({ type: null, y: 0, isEdge: false });
      return;
    }

    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (!currentNode) return;

    // Left zone: 20-50px from left edge
    if (x >= 0 && x <= 50) {
      const hasPrev = !!getPrevSibling(currentNodeId);
      setSidePopup({ type: 'left', y, isEdge: !hasPrev });
      return;
    }

    // Right zone: 20-50px from right edge
    if (x >= rect.width - 50 && x <= rect.width) {
      const hasNext = !!getNextSibling(currentNodeId);
      setSidePopup({ type: 'right', y, isEdge: !hasNext });
      return;
    }

    setSidePopup({ type: null, y: 0, isEdge: false });
  }, [currentNodeId, nodes, getPrevSibling, getNextSibling]);

  const handleSideButtonClick = useCallback(async (direction: 'left' | 'right') => {
    if (!currentNodeId) return;

    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (!currentNode) return;

    setNavigationTrigger('button');

    if (direction === 'left') {
      const hasPrev = !!getPrevSibling(currentNodeId);
      if (hasPrev) {
        const prev = getPrevSibling(currentNodeId);
        if (prev) {
          await setCurrentNode(prev.id);
        }
      } else {
        // Create new sibling
        const newSibling = await addNode(null, currentNode.parentId, currentNode.projectId);
        await setCurrentNode(newSibling.id);
      }
    } else {
      const hasNext = !!getNextSibling(currentNodeId);
      if (hasNext) {
        const next = getNextSibling(currentNodeId);
        if (next) {
          await setCurrentNode(next.id);
        }
      } else {
        // Create new sibling
        const newSibling = await addNode(null, currentNode.parentId, currentNode.projectId);
        await setCurrentNode(newSibling.id);
      }
    }
  }, [currentNodeId, nodes, getPrevSibling, getNextSibling, addNode, setCurrentNode, setNavigationTrigger]);

  const getSideTooltipText = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      return sidePopup.type === 'left' ? (sidePopup.isEdge ? 'New sibling' : 'Previous sibling') : '';
    } else {
      return sidePopup.type === 'right' ? (sidePopup.isEdge ? 'New sibling' : 'Next sibling') : '';
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove as EventListener);
    const handleLeave = () => setSidePopup({ type: null, y: 0, isEdge: false });
    container.addEventListener('mouseleave', handleLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove as EventListener);
      container.removeEventListener('mouseleave', handleLeave);
    };
  }, [handleMouseMove]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <ChatPane width={width} groqClient={groqClient} canvasHidden={canvasHidden} />

      {/* Left side button with tooltip */}
      {sidePopup.type === 'left' && (
        <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 40 }}>
          <Tooltip placement="right" width={110} content={getSideTooltipText('left')} triangle>
            <button
              onClick={() => handleSideButtonClick('left')}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                border: '1px solid #E5E7EB', background: '#fff', color: '#374151',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
                boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#111827';
                e.currentTarget.style.color = '#111827';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.color = '#374151';
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.12)';
              }}
            >
              {sidePopup.isEdge ? <Plus size={16} strokeWidth={2.5} /> : <ArrowLeft size={16} strokeWidth={2.5} />}
            </button>
          </Tooltip>
        </div>
      )}

      {/* Right side button with tooltip */}
      {sidePopup.type === 'right' && (
        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 40 }}>
          <Tooltip placement="left" width={110} content={getSideTooltipText('right')} triangle>
            <button
              onClick={() => handleSideButtonClick('right')}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                border: '1px solid #E5E7EB', background: '#fff', color: '#374151',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
                boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#111827';
                e.currentTarget.style.color = '#111827';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.color = '#374151';
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.12)';
              }}
            >
              {sidePopup.isEdge ? <Plus size={16} strokeWidth={2.5} /> : <ArrowRight size={16} strokeWidth={2.5} />}
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
