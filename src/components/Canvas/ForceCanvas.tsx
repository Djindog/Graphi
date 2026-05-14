import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import type { Node } from '../../types';

interface Props {
  nodes: Node[];
  activeNodeId: string | null;
  activeContextNodeIds: string[];
  deactivatedNodeIds: string[];
  lineageNodeIds: string[];
  onNodeClick: (node: Node) => void;
  onNodeDoubleClick: (nodeId: string) => void;
  onNodeMenuClick: (node: Node, screenX: number, screenY: number) => void;
}

const BLUE = '#2563EB';
const BLUE_FADED = '#93C5FD';
const GRAY = '#D1D5DB';

export function ForceCanvas({ nodes, activeNodeId, activeContextNodeIds, deactivatedNodeIds, lineageNodeIds, onNodeClick, onNodeDoubleClick, onNodeMenuClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ id: string; screenX: number; screenY: number } | null>(null);

  // Keep latest callbacks in refs so cy event handlers always call the current version
  const onNodeClickRef = useRef(onNodeClick);
  const onNodeDoubleClickRef = useRef(onNodeDoubleClick);
  const onNodeMenuClickRef = useRef(onNodeMenuClick);
  useEffect(() => { onNodeClickRef.current = onNodeClick; }, [onNodeClick]);
  useEffect(() => { onNodeDoubleClickRef.current = onNodeDoubleClick; }, [onNodeDoubleClick]);
  useEffect(() => { onNodeMenuClickRef.current = onNodeMenuClick; }, [onNodeMenuClick]);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements: cytoscape.ElementDefinition[] = [];

    nodes.forEach(n => {
      const isSelected = n.id === activeNodeId;
      const isActive = activeContextNodeIds.includes(n.id);
      const isDeactivated = deactivatedNodeIds.includes(n.id);

      const inContextMode = activeContextNodeIds.length > 0 || deactivatedNodeIds.length > 0;

      let bgColor = '#FFFFFF';
      let borderColor = GRAY;
      let borderWidth = 1.5;
      let opacity = 1;

      if (isSelected || isActive) { bgColor = '#EFF6FF'; borderColor = BLUE; borderWidth = isSelected ? 4 : 2.5; }
      else if (isDeactivated) { bgColor = '#F9FAFB'; borderColor = BLUE_FADED; borderWidth = 1.5; opacity = 0.45; }
      else if (inContextMode) { opacity = 0.35; }

      elements.push({
        group: 'nodes',
        data: { id: n.id, label: n.title || 'Untitled' },
        style: { 'background-color': bgColor, 'border-color': borderColor, 'border-width': borderWidth, opacity },
      });
    });

    nodes.forEach(n => {
      if (!n.parentId || !nodes.find(p => p.id === n.parentId)) return;

      const tier = (id: string): 'bright' | 'faded' | 'gray' => {
        if (id === activeNodeId) return 'bright';
        if (lineageNodeIds.includes(id) && activeContextNodeIds.includes(id)) return 'bright';
        if (lineageNodeIds.includes(id) && deactivatedNodeIds.includes(id)) return 'faded';
        return 'gray';
      };
      const src = tier(n.parentId);
      const tgt = tier(n.id);
      const lineColor = (src === 'gray' || tgt === 'gray') ? GRAY : (src === 'faded' || tgt === 'faded') ? BLUE_FADED : BLUE;
      const edgeOpacity = lineColor === GRAY ? 0.7 : lineColor === BLUE_FADED ? 0.4 : 1;
      const edgeWidth = lineColor === BLUE ? 2 : 1;

      elements.push({
        group: 'edges',
        data: { id: `e_${n.parentId}_${n.id}`, source: n.parentId, target: n.id },
        style: { 'line-color': lineColor, opacity: edgeOpacity, width: edgeWidth },
      });
    });

    cyRef.current?.destroy();

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            width: 22, height: 22,
            'border-width': 1.5,
            label: 'data(label)',
            'font-size': '10px',
            color: '#6B7280',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'text-max-width': '90px',
            'text-wrap': 'ellipsis',
            'font-family': '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': GRAY,
            'arrow-scale': 0.5,
          },
        },
      ],
      layout: { name: 'cose', animate: false } as cytoscape.LayoutOptions,
      minZoom: 0.15, maxZoom: 5,
    });

    // Track hover position for the "···" overlay button
    cy.on('mouseover', 'node', (evt) => {
      const pos = evt.target.renderedPosition();
      const rect = containerRef.current!.getBoundingClientRect();
      setHoveredNode({ id: evt.target.id(), screenX: rect.left + pos.x, screenY: rect.top + pos.y });
    });
    cy.on('mouseout', 'node', () => setHoveredNode(null));

    // Single vs double tap
    let tapTimer: ReturnType<typeof setTimeout> | null = null;
    cy.on('tap', 'node', (evt) => {
      const nodeId = evt.target.id();
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      if (tapTimer !== null) {
        clearTimeout(tapTimer);
        tapTimer = null;
        onNodeDoubleClickRef.current(nodeId);
      } else {
        tapTimer = setTimeout(() => {
          tapTimer = null;
          onNodeClickRef.current(node);
        }, 220);
      }
    });

    cyRef.current = cy;
    return () => {
      if (tapTimer !== null) clearTimeout(tapTimer);
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [nodes, activeNodeId, activeContextNodeIds, deactivatedNodeIds, lineageNodeIds]);

  const hoveredNodeObj = hoveredNode ? nodes.find(n => n.id === hoveredNode.id) : null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {hoveredNode && hoveredNodeObj && (
        <button
          onMouseEnter={() => { /* keep visible */ }}
          onClick={(e) => {
            e.stopPropagation();
            onNodeMenuClickRef.current(hoveredNodeObj, hoveredNode.screenX + 16, hoveredNode.screenY - 8);
          }}
          style={{
            position: 'fixed',
            left: hoveredNode.screenX + 8,
            top: hoveredNode.screenY - 14,
            zIndex: 50,
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 6,
            padding: '2px 6px',
            fontSize: 12,
            letterSpacing: '1.5px',
            color: '#6B7280',
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            lineHeight: 1.4,
          }}
        >
          ···
        </button>
      )}
    </div>
  );
}
