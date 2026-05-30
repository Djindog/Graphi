import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import type { Node } from '../../types';

interface Props {
  nodes: Node[];
  activeNodeId: string | null;
  activeContextNodeIds: string[];
  deactivatedNodeIds: string[];
  lineageNodeIds: string[];
  dangerNodeIds: string[];
  foldedCountMap: Map<string, number>;
  onNodeClick: (node: Node) => void;
  onNodeDoubleClick: (nodeId: string) => void;
  onNodeMenuClick: (node: Node, screenX: number, screenY: number, nodeScreenX: number, nodeScreenY: number, nodeWidth: number, nodeHeight: number) => void;
}

const NODE_W = 168;
const NODE_H = 58;
const H_GAP = 80;
const V_GAP = 92;
const MAX_W = 320;

const BLUE = '#2563EB';
const BLUE_FADED = '#93C5FD';
const GRAY = '#E5E7EB';

const SHADOW_NODE = '0 2px 6px rgba(17,24,39,0.08), 0 1px 2px rgba(17,24,39,0.04)';
const SHADOW_HOVER = '0 6px 16px rgba(17,24,39,0.12), 0 2px 4px rgba(17,24,39,0.06)';

interface TreeNode {
  data: Node;
  children: TreeNode[];
}

function expandedWidth(title: string | null): number {
  const t = title || 'Untitled';
  const [l1, l2] = wrapTitle(t);
  const longest = Math.max(l1.length, l2?.length ?? 0);
  const needed = Math.ceil(longest * 7.8) + 18;
  return Math.min(Math.max(NODE_W, needed), MAX_W);
}

function wrapTitle(title: string): [string, string | null] {
  if (title.length <= 16) return [title, null];
  const mid = Math.ceil(title.length / 2);
  let breakAt = -1;
  for (let i = mid; i >= 1; i--) {
    if (title[i] === ' ') { breakAt = i; break; }
  }
  if (breakAt === -1) {
    for (let i = mid + 1; i < title.length; i++) {
      if (title[i] === ' ') { breakAt = i; break; }
    }
  }
  if (breakAt === -1) breakAt = 16;
  const line1 = title.slice(0, breakAt).trimEnd();
  let line2 = title.slice(breakAt).trimStart();
  if (line2.length > 18) line2 = line2.slice(0, 17) + '…';
  return [line1, line2 || null];
}

export function TreeCanvas({ nodes, activeNodeId, activeContextNodeIds, deactivatedNodeIds, lineageNodeIds, dangerNodeIds, foldedCountMap, onNodeClick, onNodeDoubleClick, onNodeMenuClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable refs for visual state — Effect 2 reads these without re-running Effect 1
  const activeNodeIdRef = useRef(activeNodeId);
  const activeContextNodeIdsRef = useRef(activeContextNodeIds);
  const deactivatedNodeIdsRef = useRef(deactivatedNodeIds);
  const lineageNodeIdsRef = useRef(lineageNodeIds);
  const dangerNodeIdsRef = useRef(dangerNodeIds);

  // Keep refs in sync every render
  activeNodeIdRef.current = activeNodeId;
  activeContextNodeIdsRef.current = activeContextNodeIds;
  deactivatedNodeIdsRef.current = deactivatedNodeIds;
  lineageNodeIdsRef.current = lineageNodeIds;
  dangerNodeIdsRef.current = dangerNodeIds;

  // Called by both effects: derives node visual style from current refs
  const getNodeStyle = useCallback((nodeId: string) => {
    const _activeNodeId = activeNodeIdRef.current;
    const _activeContextNodeIds = activeContextNodeIdsRef.current;
    const _deactivatedNodeIds = deactivatedNodeIdsRef.current;
    const _dangerNodeIds = dangerNodeIdsRef.current;

    const isSelected = nodeId === _activeNodeId;
    const isActive = _activeContextNodeIds.includes(nodeId);
    const isDeactivated = _deactivatedNodeIds.includes(nodeId);
    const inContextMode = _activeContextNodeIds.length > 0 || _deactivatedNodeIds.length > 0;
    const inDanger = _dangerNodeIds.includes(nodeId);

    if (inDanger)      return { stroke: '#FCA5A5', strokeWidth: 1.5, fill: '#FEF2F2', opacity: 1,    glow: false, textColor: '#EF4444', shadow: 'none' };
    if (isSelected)    return { stroke: BLUE,      strokeWidth: 4,   fill: '#EFF6FF', opacity: 1,    glow: true,  textColor: '#1D4ED8', shadow: SHADOW_NODE };
    if (isActive)      return { stroke: BLUE,      strokeWidth: 1.5, fill: '#EFF6FF', opacity: 1,    glow: true,  textColor: '#1D4ED8', shadow: SHADOW_NODE };
    if (isDeactivated) return { stroke: BLUE_FADED,strokeWidth: 1,   fill: '#F9FAFB', opacity: 0.5,  glow: false, textColor: '#93C5FD', shadow: 'none' };
    if (inContextMode) return { stroke: GRAY,      strokeWidth: 1,   fill: '#FFFFFF', opacity: 0.4,  glow: false, textColor: '#9CA3AF', shadow: 'none' };
    return                    { stroke: GRAY,      strokeWidth: 1,   fill: '#FFFFFF', opacity: 1,    glow: false, textColor: '#111827', shadow: SHADOW_NODE };
  }, []); // stable — reads from refs, no deps

  const getEdgeStyle = useCallback((sourceId: string, targetId: string) => {
    const _activeNodeId = activeNodeIdRef.current;
    const _activeContextNodeIds = activeContextNodeIdsRef.current;
    const _deactivatedNodeIds = deactivatedNodeIdsRef.current;
    const _lineageNodeIds = lineageNodeIdsRef.current;

    const tier = (id: string): 'bright' | 'faded' | 'gray' => {
      if (id === _activeNodeId) return 'bright';
      if (_lineageNodeIds.includes(id) && _activeContextNodeIds.includes(id)) return 'bright';
      if (_lineageNodeIds.includes(id) && _deactivatedNodeIds.includes(id)) return 'faded';
      return 'gray';
    };
    const src = tier(sourceId);
    const tgt = tier(targetId);
    if (src === 'gray' || tgt === 'gray') return { stroke: '#9CA3AF',   strokeWidth: 1.5, opacity: 0.7 };
    if (src === 'faded' || tgt === 'faded') return { stroke: BLUE_FADED, strokeWidth: 1.5, opacity: 0.3 };
    return                                         { stroke: BLUE,       strokeWidth: 2,   opacity: 1   };
  }, []); // stable — reads from refs, no deps

  // ── Effect 1: structure + layout ──────────────────────────────────────────
  // Runs only when node structure or fold state changes.
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const defs = svg.append('defs');

    // Blue glow filter for active/selected nodes
    const glowFilter = defs.append('filter').attr('id', 'blue-glow')
      .attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '3.5').attr('result', 'blur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Soft drop shadow for default nodes
    const shadowFilter = defs.append('filter').attr('id', 'node-shadow')
      .attr('x', '-20%').attr('y', '-40%').attr('width', '140%').attr('height', '200%');
    shadowFilter.append('feDropShadow')
      .attr('dx', '0').attr('dy', '2').attr('stdDeviation', '3')
      .attr('flood-color', 'rgba(17,24,39,0.08)').attr('flood-opacity', '1');

    // Lifted shadow for hover state
    const liftedFilter = defs.append('filter').attr('id', 'node-shadow-lifted')
      .attr('x', '-20%').attr('y', '-60%').attr('width', '140%').attr('height', '240%');
    liftedFilter.append('feDropShadow')
      .attr('dx', '0').attr('dy', '6').attr('stdDeviation', '6')
      .attr('flood-color', 'rgba(17,24,39,0.12)').attr('flood-opacity', '1');

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

    const treeData = treeLayout(hierarchy);

    const allX = treeData.descendants().map(d => d.x);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const cx = width / 2 - (minX + maxX) / 2;
    const cy = 60;
    root.attr('transform', `translate(${cx},${cy})`);
    svg.call(zoom.transform, d3.zoomIdentity.translate(cx, cy));

    // Edges — tagged with source/target IDs for Effect 2 to restyle
    treeData.links().forEach(link => {
      const sx = link.source.x, sy = link.source.y + NODE_H / 2;
      const tx = link.target.x, ty = link.target.y - NODE_H / 2;
      const midY = sy + (ty - sy) * 0.5;
      const srcId = (link.source.data as TreeNode).data.id;
      const tgtId = (link.target.data as TreeNode).data.id;
      const es = getEdgeStyle(srcId, tgtId);

      const pathD = `M${sx},${sy} C${sx},${midY} ${tx},${midY} ${tx},${ty}`;

      root.append('path')
        .attr('class', 'tree-edge')
        .attr('data-src', srcId)
        .attr('data-tgt', tgtId)
        .attr('d', pathD)
        .attr('fill', 'none')
        .attr('stroke', es.stroke)
        .attr('stroke-width', es.strokeWidth)
        .attr('opacity', es.opacity);
    });

    const timers: ReturnType<typeof setTimeout>[] = [];

    treeData.descendants().forEach(d => {
      const nodeData = (d.data as TreeNode).data;
      const ns = getNodeStyle(nodeData.id);
      const isCurrent = nodeData.id === activeNodeIdRef.current;
      const expW = expandedWidth(nodeData.title);
      const initW = isCurrent ? expW : NODE_W;

      const g = root.append('g')
        .attr('class', 'tree-node')
        .attr('data-id', nodeData.id)
        .attr('transform', `translate(${d.x - initW / 2},${d.y - NODE_H / 2})`)
        .attr('cursor', 'pointer')
        .attr('opacity', ns.opacity);

      if (ns.glow) {
        g.append('rect')
          .attr('class', 'glow-bg')
          .attr('width', initW).attr('height', NODE_H).attr('rx', 12)
          .attr('fill', 'none')
          .attr('stroke', BLUE).attr('stroke-width', 6).attr('stroke-opacity', 0.16)
          .attr('filter', 'url(#blue-glow)');
      }

      g.append('rect')
        .attr('class', 'node-bg')
        .attr('width', initW).attr('height', NODE_H).attr('rx', 12)
        .attr('fill', ns.fill)
        .attr('stroke', ns.stroke)
        .attr('stroke-width', ns.strokeWidth)
        .attr('filter', ns.shadow !== 'none' ? 'url(#node-shadow)' : '');

      const fullTitle = nodeData.title || 'Untitled';
      const [fl1, fl2] = wrapTitle(fullTitle);
      const initX = isCurrent ? expW / 2 : NODE_W / 2;
      const lineH = 16;
      const textY1 = fl2 ? NODE_H / 2 - lineH / 2 : NODE_H / 2;
      const textY2 = textY1 + lineH;

      const textEl = g.append('text')
        .attr('class', 'node-label')
        .attr('text-anchor', 'middle')
        .attr('fill', ns.textColor)
        .attr('font-size', '13.5px')
        .attr('font-family', '-apple-system, BlinkMacSystemFont, Inter, sans-serif')
        .attr('font-weight', isCurrent ? '800' : '500')
        .attr('pointer-events', 'none');

      textEl.append('tspan')
        .attr('class', 'line1')
        .attr('x', initX).attr('y', textY1)
        .attr('dominant-baseline', 'middle')
        .text(fl1);

      if (fl2) {
        textEl.append('tspan')
          .attr('class', 'line2')
          .attr('x', initX).attr('y', textY2)
          .attr('dominant-baseline', 'middle')
          .text(fl2);
      }

      const dotMenu = g.append('g')
        .attr('class', 'dot-menu')
        .attr('opacity', 0)
        .attr('cursor', 'pointer')
        .attr('transform', `translate(${initW - NODE_W},0)`);

      dotMenu.append('rect')
        .attr('class', 'dot-menu-bg')
        .attr('x', NODE_W - 26).attr('y', 4)
        .attr('width', 22).attr('height', NODE_H - 8)
        .attr('rx', 5)
        .attr('fill', ns.fill);

      dotMenu.append('text')
        .attr('x', NODE_W - 15).attr('y', NODE_H / 2)
        .attr('dominant-baseline', 'middle').attr('text-anchor', 'middle')
        .attr('font-size', '13px').attr('letter-spacing', '1.5px')
        .attr('fill', '#6B7280')
        .attr('pointer-events', 'none')
        .text('···');

      g.on('mouseenter', () => {
        dotMenu.attr('opacity', 1);
        if (!isCurrent && ns.shadow !== 'none') {
          g.select<SVGRectElement>('rect.node-bg').attr('filter', 'url(#node-shadow-lifted)');
        }
        if (isCurrent) return;
        g.transition().duration(140)
          .attr('transform', `translate(${d.x - expW / 2},${d.y - NODE_H / 2})`);
        g.select<SVGRectElement>('rect.node-bg').transition().duration(140)
          .attr('width', expW);
        if (ns.glow) {
          g.select<SVGRectElement>('rect.glow-bg').transition().duration(140)
            .attr('width', expW);
        }
        g.select<SVGTextElement>('text.node-label')
          .selectAll('tspan')
          .transition().duration(140)
          .attr('x', expW / 2)
          .on('end', function(_d, i) {
            const [el1, el2] = wrapTitle(fullTitle);
            if (i === 0) d3.select(this).text(el1);
            else d3.select(this).text(el2 ?? '');
          });
        dotMenu.transition().duration(140)
          .attr('transform', `translate(${expW - NODE_W},0)`);
      });

      g.on('mouseleave', () => {
        dotMenu.attr('opacity', 0);
        if (ns.shadow !== 'none') {
          g.select<SVGRectElement>('rect.node-bg').attr('filter', 'url(#node-shadow)');
        }
        if (isCurrent) return;
        g.transition().duration(140)
          .attr('transform', `translate(${d.x - NODE_W / 2},${d.y - NODE_H / 2})`);
        g.select<SVGRectElement>('rect.node-bg').transition().duration(140)
          .attr('width', NODE_W);
        if (ns.glow) {
          g.select<SVGRectElement>('rect.glow-bg').transition().duration(140)
            .attr('width', NODE_W);
        }
        g.select<SVGTextElement>('text.node-label')
          .selectAll('tspan')
          .transition().duration(140)
          .attr('x', NODE_W / 2);
        dotMenu.transition().duration(140)
          .attr('transform', 'translate(0,0)');
      });

      dotMenu.on('click', (event: MouseEvent) => {
        event.stopPropagation();
        const svgRect = svgRef.current!.getBoundingClientRect();
        const transform = d3.zoomTransform(svgRef.current!);
        const scaledW = expW * transform.k;
        const scaledH = NODE_H * transform.k;
        const nodeScreenX = svgRect.left + transform.applyX(d.x - expW / 2);
        const nodeScreenY = svgRect.top + transform.applyY(d.y - NODE_H / 2);
        const overlayX = svgRect.left + transform.applyX(d.x + expW / 2) + 12;
        const overlayY = nodeScreenY;
        onNodeMenuClick(nodeData, overlayX, overlayY, nodeScreenX, nodeScreenY, scaledW, scaledH);
      });

      // Fold badge
      const foldCount = foldedCountMap.get(nodeData.id);
      if (foldCount !== undefined) {
        const label = String(foldCount);
        const badgeH = 26;
        const badgeW = Math.max(26, label.length * 10 + 14);
        const badgeX = initW;
        const badgeY = NODE_H - 2;

        g.append('rect')
          .attr('class', 'fold-badge-bg')
          .attr('x', badgeX - badgeW / 2).attr('y', badgeY - badgeH / 2)
          .attr('width', badgeW).attr('height', badgeH)
          .attr('rx', badgeH / 2)
          .attr('fill', '#2563EB')
          .attr('pointer-events', 'none');

        g.append('text')
          .attr('class', 'fold-badge-text')
          .attr('x', badgeX).attr('y', badgeY)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
          .attr('font-size', '12px').attr('font-weight', '600')
          .attr('fill', '#fff').attr('pointer-events', 'none')
          .attr('font-family', '-apple-system, BlinkMacSystemFont, Inter, sans-serif')
          .text(label);
      }

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, foldedCountMap, onNodeClick, onNodeDoubleClick, onNodeMenuClick]);
  // Visual state is intentionally excluded — Effect 2 handles restyling without a rebuild.

  // ── Effect 2: visual style only ───────────────────────────────────────────
  // Runs when selection / context state changes. Touches only fill/stroke/opacity
  // on existing elements — no layout, no DOM teardown.
  useEffect(() => {
    const svg = d3.select(svgRef.current);

    // Restyle node groups
    svg.selectAll<SVGGElement, unknown>('g.tree-node').each(function() {
      const nodeId = d3.select(this).attr('data-id');
      if (!nodeId) return;
      const ns = getNodeStyle(nodeId);

      d3.select(this).attr('opacity', ns.opacity);

      d3.select(this).select<SVGRectElement>('rect.node-bg')
        .attr('fill', ns.fill)
        .attr('stroke', ns.stroke)
        .attr('stroke-width', ns.strokeWidth);

      d3.select(this).select<SVGRectElement>('rect.dot-menu-bg')
        .attr('fill', ns.fill);

      d3.select(this).select<SVGTextElement>('text.node-label')
        .attr('fill', ns.textColor);

      const glowBg = d3.select(this).select<SVGRectElement>('rect.glow-bg');
      if (!glowBg.empty()) {
        if (ns.glow) {
          glowBg.attr('display', null);
        } else {
          glowBg.attr('display', 'none');
        }
      }
    });

    // Restyle edges
    svg.selectAll<SVGPathElement, unknown>('path.tree-edge').each(function() {
      const el = d3.select(this);
      const srcId = el.attr('data-src');
      const tgtId = el.attr('data-tgt');
      if (!srcId || !tgtId) return;
      const es = getEdgeStyle(srcId, tgtId);
      el.attr('stroke', es.stroke)
        .attr('stroke-width', es.strokeWidth)
        .attr('opacity', es.opacity);
    });
  }, [activeNodeId, activeContextNodeIds, deactivatedNodeIds, lineageNodeIds, dangerNodeIds, getNodeStyle, getEdgeStyle]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
