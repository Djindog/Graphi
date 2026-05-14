import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
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

const NODE_W = 160;
const NODE_H = 40;
const H_GAP = 80;
const V_GAP = 80;
const MAX_W = 320;

const BLUE = '#2563EB';
const BLUE_FADED = '#93C5FD';
const GRAY = '#D1D5DB';

interface TreeNode {
  data: Node;
  children: TreeNode[];
}

// Estimate pixel width needed to display the full title comfortably.
function expandedWidth(title: string | null): number {
  const t = title || 'Untitled';
  const needed = Math.ceil(t.length * 7.8) + 18; // ~7.8px/char + 12px padding + 26px dotMenu
  return Math.min(Math.max(NODE_W, needed), MAX_W);
}

export function TreeCanvas({ nodes, activeNodeId, activeContextNodeIds, deactivatedNodeIds, lineageNodeIds, onNodeClick, onNodeDoubleClick, onNodeMenuClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getNodeStyle = useCallback((nodeId: string) => {
    const isSelected = nodeId === activeNodeId;
    const isActive = activeContextNodeIds.includes(nodeId);
    const isDeactivated = deactivatedNodeIds.includes(nodeId);
    const inContextMode = activeContextNodeIds.length > 0 || deactivatedNodeIds.length > 0;

    if (isSelected) {
      return { stroke: BLUE, strokeWidth: 4, fill: '#EFF6FF', opacity: 1, glow: true, textColor: '#1D4ED8' };
    }
    if (isActive) {
      return { stroke: BLUE, strokeWidth: 2.5, fill: '#EFF6FF', opacity: 1, glow: true, textColor: '#1D4ED8' };
    }
    if (isDeactivated) {
      return { stroke: BLUE_FADED, strokeWidth: 1.5, fill: '#F9FAFB', opacity: 0.45, glow: false, textColor: '#93C5FD' };
    }
    // Out-of-context nodes dim in context mode so active nodes stand out
    if (inContextMode) {
      return { stroke: GRAY, strokeWidth: 1.5, fill: '#FFFFFF', opacity: 0.35, glow: false, textColor: '#9CA3AF' };
    }
    return { stroke: GRAY, strokeWidth: 1.5, fill: '#FFFFFF', opacity: 1, glow: false, textColor: '#374151' };
  }, [activeNodeId, activeContextNodeIds, deactivatedNodeIds]);

  // A colored edge requires BOTH endpoints to be colored — no dangling edges.
  const getEdgeStyle = useCallback((sourceId: string, targetId: string) => {
    const tier = (id: string): 'bright' | 'faded' | 'gray' => {
      if (id === activeNodeId) return 'bright';
      if (lineageNodeIds.includes(id) && activeContextNodeIds.includes(id)) return 'bright';
      if (lineageNodeIds.includes(id) && deactivatedNodeIds.includes(id)) return 'faded';
      return 'gray';
    };
    const src = tier(sourceId);
    const tgt = tier(targetId);
    if (src === 'gray' || tgt === 'gray') return { stroke: GRAY, strokeWidth: 1, opacity: 0.7 };
    if (src === 'faded' || tgt === 'faded') return { stroke: BLUE_FADED, strokeWidth: 1, opacity: 0.4 };
    return { stroke: BLUE, strokeWidth: 2, opacity: 1 };
  }, [activeNodeId, lineageNodeIds, activeContextNodeIds, deactivatedNodeIds]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'blue-glow')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const root = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on('zoom', (event) => root.attr('transform', event.transform));
    svg.call(zoom);

    if (nodes.length === 0) return;

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const rootNode = nodes.find(n => !n.parentId || !nodeMap.has(n.parentId));
    if (!rootNode) return;

    const buildTree = (node: Node): TreeNode => ({
      data: node,
      children: nodes.filter(n => n.parentId === node.id).map(buildTree),
    });

    const hierarchy = d3.hierarchy(buildTree(rootNode), d => d.children);
    const treeLayout = d3.tree<TreeNode>()
      .nodeSize([NODE_W + H_GAP, NODE_H + V_GAP])
      .separation((a, b) => a.parent === b.parent ? 1 : 1);
    // const treeLayout = d3.tree<TreeNode>().separation((a, b) => (a.parent === b.parent ? 1.5 : 2) / 1);

    const treeData = treeLayout(hierarchy);

    const allX = treeData.descendants().map(d => d.x);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const cx = width / 2 - (minX + maxX) / 2;
    const cy = 60;
    root.attr('transform', `translate(${cx},${cy})`);
    svg.call(zoom.transform, d3.zoomIdentity.translate(cx, cy));

    // Edges first (drawn under nodes)
    treeData.links().forEach(link => {
      const sx = link.source.x, sy = link.source.y + NODE_H / 2;
      const tx = link.target.x, ty = link.target.y - NODE_H / 2;
      const midY = sy + (ty - sy) * 0.5;
      const bend = 10;
      const dir = tx > sx ? 1 : tx < sx ? -1 : 0;
      const srcId = (link.source.data as TreeNode).data.id;
      const tgtId = (link.target.data as TreeNode).data.id;
      const es = getEdgeStyle(srcId, tgtId);

      let pathD: string;
      if (tx === sx) {
        pathD = `M${sx},${sy} L${tx},${ty}`;
      } else {
        pathD = `M${sx},${sy} L${sx},${midY - bend} Q${sx},${midY} ${sx + dir * bend},${midY} L${tx - dir * bend},${midY} Q${tx},${midY} ${tx},${midY + bend} L${tx},${ty}`;
      }

      root.append('path')
        .attr('d', pathD)
        .attr('fill', 'none')
        .attr('stroke', es.stroke)
        .attr('stroke-width', es.strokeWidth)
        .attr('opacity', es.opacity);
    });

    // Track click timers for cleanup
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Nodes
    treeData.descendants().forEach(d => {
      const nodeData = (d.data as TreeNode).data;
      const ns = getNodeStyle(nodeData.id);
      const isCurrent = nodeData.id === activeNodeId;
      const expW = expandedWidth(nodeData.title);
      // Current node starts fully expanded; others start at NODE_W
      const initW = isCurrent ? expW : NODE_W;

      const g = root.append('g')
        .attr('transform', `translate(${d.x - initW / 2},${d.y - NODE_H / 2})`)
        .attr('cursor', 'pointer')
        .attr('opacity', ns.opacity);

      if (ns.glow) {
        g.append('rect')
          .attr('class', 'glow-bg')
          .attr('width', initW).attr('height', NODE_H).attr('rx', 10)
          .attr('fill', 'none')
          .attr('stroke', BLUE).attr('stroke-width', 8).attr('stroke-opacity', 0.15)
          .attr('filter', 'url(#blue-glow)');
      }

      g.append('rect')
        .attr('class', 'node-bg')
        .attr('width', initW).attr('height', NODE_H).attr('rx', 10)
        .attr('fill', ns.fill)
        .attr('stroke', ns.stroke)
        .attr('stroke-width', ns.strokeWidth);

      // Text: full title if current, truncated otherwise
      g.append('text')
        .attr('class', 'node-label')
        .attr('x', isCurrent ? expW / 2 : (NODE_W - 20) / 2)
        .attr('y', NODE_H / 2)
        .attr('dominant-baseline', 'middle').attr('text-anchor', 'middle')
        .attr('fill', ns.textColor)
        .attr('font-size', '13px')
        .attr('font-family', '-apple-system, BlinkMacSystemFont, Inter, sans-serif')
        .attr('font-weight', isCurrent ? '500' : '400')
        .attr('pointer-events', 'none')
        .text(() => {
          const t = nodeData.title || 'Untitled';
          if (isCurrent) return t;
          return t.length > 16 ? t.slice(0, 16) + '…' : t;
        });

      // "···" menu — dotMenu group is translated so its internal coords stay fixed at NODE_W
      // and we shift the whole group rightward by (initW - NODE_W)
      const dotMenu = g.append('g')
        .attr('class', 'dot-menu')
        .attr('opacity', 0)
        .attr('cursor', 'pointer')
        .attr('transform', `translate(${initW - NODE_W},0)`);

      dotMenu.append('rect')
        .attr('x', NODE_W - 26).attr('y', 4)
        .attr('width', 22).attr('height', NODE_H - 8)
        .attr('rx', 5)
        .attr('fill', 'rgba(255,255,255,0.85)');

      dotMenu.append('text')
        .attr('x', NODE_W - 15).attr('y', NODE_H / 2)
        .attr('dominant-baseline', 'middle').attr('text-anchor', 'middle')
        .attr('font-size', '13px').attr('letter-spacing', '1.5px')
        .attr('fill', '#6B7280')
        .attr('pointer-events', 'none')
        .text('···');

      // Hover: show dotMenu + expand node width (non-current nodes only)
      g.on('mouseenter', () => {
        dotMenu.attr('opacity', 1);
        if (isCurrent) return; // already expanded
        g.transition().duration(140)
          .attr('transform', `translate(${d.x - expW / 2},${d.y - NODE_H / 2})`);
        g.select<SVGRectElement>('rect.node-bg').transition().duration(140)
          .attr('width', expW);
        if (ns.glow) {
          g.select<SVGRectElement>('rect.glow-bg').transition().duration(140)
            .attr('width', expW);
        }
        g.select<SVGTextElement>('text.node-label').transition().duration(140)
          .attr('x', expW / 2)
          .text(nodeData.title || 'Untitled');
        dotMenu.transition().duration(140)
          .attr('transform', `translate(${expW - NODE_W},0)`);
      });

      g.on('mouseleave', () => {
        dotMenu.attr('opacity', 0);
        if (isCurrent) return;
        g.transition().duration(140)
          .attr('transform', `translate(${d.x - NODE_W / 2},${d.y - NODE_H / 2})`);
        g.select<SVGRectElement>('rect.node-bg').transition().duration(140)
          .attr('width', NODE_W);
        if (ns.glow) {
          g.select<SVGRectElement>('rect.glow-bg').transition().duration(140)
            .attr('width', NODE_W);
        }
        g.select<SVGTextElement>('text.node-label').transition().duration(140)
          .attr('x', (NODE_W - 20) / 2)
          .text(() => {
            const t = nodeData.title || 'Untitled';
            return t.length > 16 ? t.slice(0, 16) + '…' : t;
          });
        dotMenu.transition().duration(140)
          .attr('transform', 'translate(0,0)');
      });

      // "···" click → tool overlay
      dotMenu.on('click', (event: MouseEvent) => {
        event.stopPropagation();
        const svgRect = svgRef.current!.getBoundingClientRect();
        const transform = d3.zoomTransform(svgRef.current!);
        // When dotMenu is visible the node is always at expW
        const screenX = svgRect.left + transform.applyX(d.x + expW / 2) + 12;
        const screenY = svgRect.top + transform.applyY(d.y - NODE_H / 2);
        onNodeMenuClick(nodeData, screenX, screenY);
      });

      // Main node body: single vs double click
      let clickTimer: ReturnType<typeof setTimeout> | null = null;

      g.on('click', (event: MouseEvent) => {
        event.stopPropagation();
        if (clickTimer !== null) {
          clearTimeout(clickTimer);
          clickTimer = null;
          onNodeDoubleClick(nodeData.id);
        } else {
          clickTimer = setTimeout(() => {
            clickTimer = null;
            onNodeClick(nodeData);
          }, 220);
          timers.push(clickTimer);
        }
      });
    });

    return () => { timers.forEach(t => clearTimeout(t)); };
  }, [nodes, activeNodeId, activeContextNodeIds, deactivatedNodeIds, lineageNodeIds, onNodeClick, onNodeDoubleClick, onNodeMenuClick, getNodeStyle, getEdgeStyle]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
