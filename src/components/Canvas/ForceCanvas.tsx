import { useEffect, useRef, useState } from 'react';
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
  onNodeCtrlClick: (node: Node) => void;
  onNodeDoubleClick: (nodeId: string) => void;
  onNodeMenuClick: (node: Node, screenX: number, screenY: number, nodeScreenX: number, nodeScreenY: number, nodeWidth: number, nodeHeight: number) => void;
}

const BLUE = '#2563EB';
const BLUE_FADED = '#93C5FD';
const GRAY = '#D1D5DB';

const NODE_RADIUS = 11;

function wrapForceTitle(title: string): [string, string | null] {
  if (title.length <= 12) return [title, null];
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
  if (breakAt === -1) breakAt = 12;
  const l1 = title.slice(0, breakAt).trimEnd();
  let l2 = title.slice(breakAt).trimStart();
  if (l2.length > 14) l2 = l2.slice(0, 13) + '…';
  return [l1, l2 || null];
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  title: string | null;
  parentId: string | null;
  projectId: string;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode;
  target: SimNode;
}

export function ForceCanvas({ nodes, activeNodeId, activeContextNodeIds, deactivatedNodeIds, lineageNodeIds, dangerNodeIds, foldedCountMap, onNodeClick, onNodeCtrlClick, onNodeDoubleClick, onNodeMenuClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const nodeMapRef = useRef<Map<string, Node>>(new Map());

  const [hoveredNode, setHoveredNode] = useState<{ id: string; screenX: number; screenY: number } | null>(null);

  // Keep latest callbacks in refs so event handlers always call the current version
  const onNodeClickRef = useRef(onNodeClick);
  const onNodeCtrlClickRef = useRef(onNodeCtrlClick);
  const onNodeDoubleClickRef = useRef(onNodeDoubleClick);
  const onNodeMenuClickRef = useRef(onNodeMenuClick);
  useEffect(() => { onNodeClickRef.current = onNodeClick; }, [onNodeClick]);
  useEffect(() => { onNodeCtrlClickRef.current = onNodeCtrlClick; }, [onNodeCtrlClick]);
  useEffect(() => { onNodeDoubleClickRef.current = onNodeDoubleClick; }, [onNodeDoubleClick]);
  useEffect(() => { onNodeMenuClickRef.current = onNodeMenuClick; }, [onNodeMenuClick]);

  // Effect 1: Setup simulation and SVG when nodes array changes
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    // Build node/link data, preserving existing positions
    const simNodes: SimNode[] = nodes.map(n => {
      const existing = simNodesRef.current.find(sn => sn.id === n.id);
      return {
        id: n.id,
        title: n.title,
        parentId: n.parentId,
        projectId: n.projectId,
        x: existing?.x ?? width / 2 + Math.random() * 100,
        y: existing?.y ?? height / 2 + Math.random() * 100,
      };
    });
    simNodesRef.current = simNodes;

    const nodeSet = new Set(nodes.map(n => n.id));
    const simLinks: SimLink[] = nodes
      .filter(n => n.parentId && nodeSet.has(n.parentId))
      .map(n => {
        const source = simNodes.find(sn => sn.id === n.parentId)!;
        const target = simNodes.find(sn => sn.id === n.id)!;
        return { source, target };
      });

    // Update node map for later lookups
    nodeMapRef.current = new Map(nodes.map(n => [n.id, n]));

    // Cleanup old simulation
    if (simRef.current) simRef.current.stop();

    // Create simulation
    const simulation = d3.forceSimulation<SimNode, SimLink>(simNodes)
      .force('link', d3.forceLink<SimNode, SimLink>(simLinks)
        .id(d => d.id)
        .distance(80)
        .strength(0.4)
      )
      .force('charge', d3.forceManyBody<SimNode>().strength(-300))
      .force('center', d3.forceCenter<SimNode>(width / 2, height / 2).strength(0.05))
      .force('collision', d3.forceCollide<SimNode>().radius(NODE_RADIUS + 10))
      .alphaDecay(0.02);

    simRef.current = simulation;

    // Clear SVG and rebuild
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    // Add glow filter (same as TreeCanvas)
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'blue-glow-force')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Links (paths)
    const link = g.append('g')
      .selectAll('path')
      .data(simLinks)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', GRAY)
      .attr('stroke-width', 1)
      .attr('opacity', 0.7)
      .attr('marker-end', 'url(#arrowhead)');

    // Add arrowhead marker
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('refX', NODE_RADIUS + 6)
      .attr('refY', 1.5)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 1.5, 0 3')
      .attr('fill', GRAY);

    // Node groups
    const nodeGroup = g.append('g')
      .selectAll('g')
      .data(simNodes, (d: any) => d.id)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, SimNode>()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
      );

    nodeGroup.append('circle')
      .attr('class', 'node-circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', '#FFFFFF')
      .attr('stroke', GRAY)
      .attr('stroke-width', 1.5);

    nodeGroup.each(function(d) {
      const t = d.title || 'Untitled';
      const [l1, l2] = wrapForceTitle(t);
      const textEl = d3.select(this).append('text')
        .attr('class', 'node-label')
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-family', '-apple-system, BlinkMacSystemFont, Inter, sans-serif')
        .attr('fill', '#6B7280')
        .attr('pointer-events', 'none');
      textEl.append('tspan')
        .attr('x', 0).attr('dy', NODE_RADIUS + 12)
        .text(l1);
      if (l2) {
        textEl.append('tspan')
          .attr('x', 0).attr('dy', 13)
          .text(l2);
      }
    });

    // Fold badges
    nodeGroup.each(function(d) {
      const count = foldedCountMap.get(d.id);
      if (count === undefined) return;
      const label = String(count);
      const badgeH = 18;
      const badgeW = Math.max(18, label.length * 8 + 10);
      // Center at the bottom-right corner of the circle's bounding box
      const bx = NODE_RADIUS;
      const by = NODE_RADIUS;
      const g = d3.select(this);
      g.append('rect')
        .attr('x', bx - badgeW / 2).attr('y', by - badgeH / 2)
        .attr('width', badgeW).attr('height', badgeH)
        .attr('rx', badgeH / 2)
        .attr('fill', '#2563EB')
        .attr('pointer-events', 'none');
      g.append('text')
        .attr('x', bx).attr('y', by)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('font-size', '11px').attr('font-weight', '600')
        .attr('fill', '#fff').attr('pointer-events', 'none')
        .attr('font-family', '-apple-system, BlinkMacSystemFont, Inter, sans-serif')
        .text(label);
    });

    // Hover & click tracking
    let clickTimer: ReturnType<typeof setTimeout> | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];

    nodeGroup.on('mouseover', (evt) => {
      const pos = d3.select(evt.currentTarget).datum() as SimNode;
      const rect = containerRef.current!.getBoundingClientRect();
      const transform = d3.zoomTransform(svgRef.current!);
      const sx = rect.left + transform.applyX(pos.x ?? 0);
      const sy = rect.top + transform.applyY(pos.y ?? 0);
      setHoveredNode({ id: pos.id, screenX: sx, screenY: sy });
    })
      .on('mouseout', () => setHoveredNode(null))
      .on('click', (evt, d) => {
        evt.stopPropagation();
        const nodeData = nodeMapRef.current.get(d.id);
        if (!nodeData) return;

        if (clickTimer !== null) {
          clearTimeout(clickTimer);
          clickTimer = null;
          onNodeDoubleClickRef.current(d.id);
        } else {
          const isCtrl = evt.ctrlKey || evt.metaKey;
          clickTimer = setTimeout(() => {
            clickTimer = null;
            if (isCtrl) onNodeCtrlClickRef.current(nodeData);
            else onNodeClickRef.current(nodeData);
          }, 220);
          timers.push(clickTimer);
        }
      });

    // Simulation tick
    simulation.on('tick', () => {
      link.attr('d', (d) => {
        const sx = (d.source as SimNode).x ?? 0;
        const sy = (d.source as SimNode).y ?? 0;
        const tx = (d.target as SimNode).x ?? 0;
        const ty = (d.target as SimNode).y ?? 0;
        return `M${sx},${sy}L${tx},${ty}`;
      });

      nodeGroup.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    function dragStarted(event: any, d: SimNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: SimNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event: any, d: SimNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
      timers.forEach(t => clearTimeout(t));
    };
  }, [nodes, foldedCountMap]);

  // Effect 2: Update node/edge styling based on state (not simulation-related)
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const inContextMode = activeContextNodeIds.length > 0 || deactivatedNodeIds.length > 0;

    const getNodeStyle = (nodeId: string) => {
      const isSelected = nodeId === activeNodeId;
      const isActive = activeContextNodeIds.includes(nodeId);
      const isDeactivated = deactivatedNodeIds.includes(nodeId);
      const inDanger = dangerNodeIds.includes(nodeId);

      let fill = '#FFFFFF';
      let stroke = GRAY;
      let strokeWidth = 1.5;
      let opacity = 1;
      let glow = false;

      if (inDanger) {
        fill = '#FEF2F2'; stroke = '#FCA5A5'; strokeWidth = 2; opacity = 1;
      } else if (isSelected) {
        fill = '#EFF6FF'; stroke = BLUE; strokeWidth = 3.5; opacity = 1; glow = true;
      } else if (isActive) {
        fill = '#EFF6FF'; stroke = BLUE; strokeWidth = 2; opacity = 1; glow = true;
      } else if (isDeactivated) {
        fill = '#F9FAFB'; stroke = BLUE_FADED; strokeWidth = 1.5; opacity = 0.45;
      } else if (inContextMode) {
        stroke = GRAY; fill = '#FFFFFF'; opacity = 0.35;
      }

      return { fill, stroke, strokeWidth, opacity, glow };
    };

    const getEdgeStyle = (sourceId: string, targetId: string) => {
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
    };

    // Update node styles
    svg.selectAll('g.node').each(function(d: any) {
      const ns = getNodeStyle(d.id);
      d3.select(this).select('circle')
        .attr('fill', ns.fill)
        .attr('stroke', ns.stroke)
        .attr('stroke-width', ns.strokeWidth)
        .attr('opacity', ns.opacity)
        .attr('filter', ns.glow ? 'url(#blue-glow-force)' : null);
    });

    // Update link styles
    svg.selectAll('path.link').each(function(d: any) {
      const es = getEdgeStyle((d.source as SimNode).id, (d.target as SimNode).id);
      d3.select(this)
        .attr('stroke', es.stroke)
        .attr('stroke-width', es.strokeWidth)
        .attr('opacity', es.opacity);
    });

    // Update arrowhead color
    svg.select('#arrowhead polygon')
      .attr('fill', GRAY);

  }, [activeNodeId, activeContextNodeIds, deactivatedNodeIds, lineageNodeIds, dangerNodeIds]);

  const hoveredNodeObj = hoveredNode ? nodes.find(n => n.id === hoveredNode.id) : null;

  const getHoveredFill = () => {
    if (!hoveredNode) return '#fff';
    const id = hoveredNode.id;
    const inDanger = dangerNodeIds.includes(id);
    if (inDanger) return '#FEF2F2';
    if (id === activeNodeId) return '#EFF6FF';
    if (activeContextNodeIds.includes(id)) return '#EFF6FF';
    if (deactivatedNodeIds.includes(id)) return '#F9FAFB';
    return '#FFFFFF';
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      </div>
      {hoveredNode && hoveredNodeObj && (
        <button
          onMouseEnter={() => { /* keep visible */ }}
          onClick={(e) => {
            e.stopPropagation();
            const r = NODE_RADIUS * 2;
            onNodeMenuClickRef.current(hoveredNodeObj, hoveredNode.screenX + 16, hoveredNode.screenY - 8, hoveredNode.screenX - NODE_RADIUS, hoveredNode.screenY - NODE_RADIUS, r, r);
          }}
          style={{
            position: 'fixed',
            left: hoveredNode.screenX + 8,
            top: hoveredNode.screenY - 14,
            zIndex: 50,
            background: getHoveredFill(),
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
