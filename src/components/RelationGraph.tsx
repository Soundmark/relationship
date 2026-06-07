import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import type { GraphNode, GraphLink } from "@/hooks/useRelationshipGraph";

interface RelationGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedId?: string;
  onNodeClick?: (node: GraphNode) => void;
}

/** BFS 同心圆布局：从 "me" 出发计算每层节点的位置 */
function computeConcentricLayout(
  nodes: GraphNode[],
  links: GraphLink[],
  centerX: number,
  centerY: number,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // 构建邻接表
  const adj = new Map<string, string[]>();
  for (const link of links) {
    const src = typeof link.source === "string" ? link.source : link.source.id;
    const tgt = typeof link.target === "string" ? link.target : link.target.id;
    if (!adj.has(src)) adj.set(src, []);
    if (!adj.has(tgt)) adj.set(tgt, []);
    adj.get(src)!.push(tgt);
    adj.get(tgt)!.push(src);
  }

  // BFS 计算每个节点到 "me" 的距离（ring 值）
  const rings = new Map<string, number>();
  const queue: string[] = ["me"];
  rings.set("me", 0);
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const neighbor of adj.get(curr) || []) {
      if (!rings.has(neighbor)) {
        rings.set(neighbor, rings.get(curr)! + 1);
        queue.push(neighbor);
      }
    }
  }

  // 按 ring 分组
  const groups = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const ring = rings.get(node.id) ?? 1; // 未连通的默认放在 ring 1
    if (!groups.has(ring)) groups.set(ring, []);
    groups.get(ring)!.push(node);
  }

  // 分配位置
  const RING_SPACING = 130;
  const angles = new Map<string, number>();

  for (const [ring, group] of groups) {
    if (ring === 0) {
      // "我" 固定在中心
      const meNode = group[0];
      positions.set(meNode.id, { x: centerX, y: centerY });
    } else {
      const radius = RING_SPACING * ring;
      group.forEach((node, i) => {
        const angle = (i / group.length) * 2 * Math.PI - Math.PI / 2;
        angles.set(node.id, angle);
        positions.set(node.id, {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        });
      });
    }
  }

  // 调整 parent-child 角度：亲长对齐子级方向，形成放射状线性链
  const childToParent = new Map<string, string>();
  for (const link of links) {
    if (link.label !== "子女") continue;
    const src = typeof link.source === "string" ? link.source : link.source.id;
    const tgt = typeof link.target === "string" ? link.target : link.target.id;
    const srcRing = rings.get(src) ?? 1;
    const tgtRing = rings.get(tgt) ?? 1;
    if (srcRing < tgtRing) childToParent.set(src, tgt);
    else if (tgtRing < srcRing) childToParent.set(tgt, src);
  }

  const parentAngles = new Map<string, number[]>();
  for (const [childId, parentId] of childToParent) {
    const childAngle = angles.get(childId);
    if (childAngle === undefined) continue;
    if (!parentAngles.has(parentId)) parentAngles.set(parentId, []);
    parentAngles.get(parentId)!.push(childAngle);
  }

  for (const [parentId, cAngles] of parentAngles) {
    const avgAngle = cAngles.reduce((sum, a) => sum + a, 0) / cAngles.length;
    angles.set(parentId, avgAngle);
    const ring = rings.get(parentId) ?? 1;
    const radius = RING_SPACING * ring;
    positions.set(parentId, {
      x: centerX + radius * Math.cos(avgAngle),
      y: centerY + radius * Math.sin(avgAngle),
    });
  }

  return positions;
}

export function RelationGraph({
  nodes,
  links,
  selectedId,
  onNodeClick,
}: RelationGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const isInitializedRef = useRef(false);
  const nodesSignatureRef = useRef("");
  const linksSignatureRef = useRef("");

  // 初始化图表（只执行一次）
  const initGraph = useCallback(() => {
    if (!svgRef.current || !containerRef.current || isInitializedRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 创建主组
    const g = svg.append("g");
    gRef.current = g;

    // 缩放行为
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    zoomRef.current = zoom;
    svg.call(zoom);

    // 定义裁剪路径的 defs
    svg.append("defs");

    // 初始居中显示
    const initialScale = 0.9;
    const initialTransform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(initialScale)
      .translate(-width / 2, -height / 2);
    svg.call(zoom.transform, initialTransform);

    isInitializedRef.current = true;
  }, []);

  // 更新图表（使用 data join + 同心圆布局）
  const updateGraph = useCallback((currentNodes: GraphNode[], currentLinks: GraphLink[]) => {
    if (!svgRef.current || !containerRef.current || !gRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const g = gRef.current;

    // 如果没有节点，显示空状态
    if (currentNodes.length === 0) {
      g.selectAll("*").remove();
      const svg = d3.select(svgRef.current);
      svg.selectAll("text.empty-hint").remove();
      svg
        .append("text")
        .attr("class", "empty-hint")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "16px")
        .style("fill", "#8B7355")
        .text("还没有亲友，点击右下角添加");
      return;
    }

    // 移除空状态提示
    d3.select(svgRef.current).selectAll("text.empty-hint").remove();

    // 准备节点数据：有保存位置就恢复，否则用同心圆布局
    const hasAnySavedPositions = currentNodes.some((n) =>
      nodePositionsRef.current.has(n.id)
    );

    let layoutPositions: Map<string, { x: number; y: number }>;
    if (hasAnySavedPositions) {
      // 恢复之前保存的位置
      layoutPositions = nodePositionsRef.current;
    } else {
      // 首次布局：同心圆
      layoutPositions = computeConcentricLayout(currentNodes, currentLinks, width / 2, height / 2);
      // 保存计算出的位置
      for (const [id, pos] of layoutPositions) {
        nodePositionsRef.current.set(id, pos);
      }
    }

    // 解析节点位置
    const layoutNodes: GraphNode[] = currentNodes.map((n) => {
      const pos = layoutPositions.get(n.id);
      return {
        ...n,
        x: pos?.x ?? width / 2,
        y: pos?.y ?? height / 2,
      };
    });

    // 解析连线，将 source/target 从 id 字符串转为节点对象引用
    const layoutLinks: GraphLink[] = currentLinks.map((l) => ({
      ...l,
      source: layoutNodes.find((n) => n.id === l.source) || l.source,
      target: layoutNodes.find((n) => n.id === l.target) || l.target,
    }));

    // 准备 defs
    const svg = d3.select(svgRef.current);
    const defs = svg.select("defs").empty()
      ? svg.append("defs")
      : svg.select("defs");

    // ========== 连线的 data join ==========
    const linkGroup = g
      .selectAll<SVGGElement, GraphLink>("g.link-group")
      .data(layoutLinks, (d: GraphLink) => d.id);

    linkGroup.exit().remove();

    const linkGroupEnter = linkGroup
      .enter()
      .append("g")
      .attr("class", "link-group");

    linkGroupEnter.append("line").attr("class", "link-line");
    linkGroupEnter.append("rect").attr("class", "link-label-bg");
    linkGroupEnter.append("text").attr("class", "link-label");

    const linkGroupMerge = linkGroupEnter.merge(linkGroup as any);

    linkGroupMerge
      .select<SVGLineElement>("line.link-line")
      .attr("stroke", "#E8DED0")
      .attr("stroke-width", 2);

    linkGroupMerge
      .select<SVGRectElement>("rect.link-label-bg")
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("fill", "#FFFBF7")
      .attr("stroke", "#E8DED0")
      .attr("stroke-width", 1);

    linkGroupMerge
      .select<SVGTextElement>("text.link-label")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "11px")
      .style("fill", "#8B7355")
      .style("pointer-events", "none")
      .text((d) => d.label);

    // 设置连线和标签位置
    linkGroupMerge.each(function (d) {
      const group = d3.select(this);
      const source = d.source as GraphNode;
      const target = d.target as GraphNode;

      group
        .select("line.link-line")
        .attr("x1", source.x!)
        .attr("y1", source.y!)
        .attr("x2", target.x!)
        .attr("y2", target.y!);

      if (!d.label) return;

      const midX = (source.x! + target.x!) / 2;
      const midY = (source.y! + target.y!) / 2;
      group.select("text.link-label").attr("x", midX).attr("y", midY);

      const text = group.select("text.link-label").node() as SVGTextElement;
      const bbox = text?.getBBox();
      if (bbox) {
        const padding = 6;
        group
          .select("rect.link-label-bg")
          .attr("x", midX - bbox.width / 2 - padding)
          .attr("y", midY - bbox.height / 2 - padding + 1)
          .attr("width", bbox.width + padding * 2)
          .attr("height", bbox.height + padding * 2);
      }
    });

    // ========== 节点的 data join ==========
    const nodeGroup = g
      .selectAll<SVGGElement, GraphNode>("g.node-group")
      .data(layoutNodes, (d: GraphNode) => d.id);

    nodeGroup.exit().remove();

    const nodeGroupEnter = nodeGroup
      .enter()
      .append("g")
      .attr("class", "node-group")
      .style("cursor", "pointer")
      .on("click", (_event, d) => {
        onNodeClick?.(d);
      });

    // 节点圆形背景
    nodeGroupEnter
      .append("circle")
      .attr("class", "node-circle")
      .attr("r", (d) => (d.isMe ? 32 : 28))
      .attr("fill", (d) => (d.isMe ? "#E8A87C" : "#FFFFFF"))
      .style("filter", "drop-shadow(0 2px 8px rgba(139, 94, 60, 0.15))");

    // 头像或首字母容器
    nodeGroupEnter.append("g").attr("class", "node-avatar");

    // 姓名
    nodeGroupEnter
      .append("text")
      .attr("class", "node-name")
      .attr("text-anchor", "middle")
      .attr("y", 42)
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "#4A4A4A");

    // 称呼（我对TA的称呼）
    nodeGroupEnter
      .append("text")
      .attr("class", "node-icall")
      .attr("text-anchor", "middle")
      .attr("y", 56)
      .style("font-size", "10px")
      .style("fill", "#8B7355");

    const nodeGroupMerge = nodeGroupEnter.merge(nodeGroup as any);

    // 更新节点样式（选中状态）
    nodeGroupMerge
      .select<SVGCircleElement>("circle.node-circle")
      .attr("stroke", (d) => {
        if (d.isMe) return "#C17F59";
        return d.id === selectedId ? "#E8A87C" : "#E8DED0";
      })
      .attr("stroke-width", (d) => (d.id === selectedId || d.isMe ? 3 : 2));

    // 更新头像/首字母
    nodeGroupMerge.each(function (d) {
      const node = d3.select(this);
      const avatarGroup = node.select("g.node-avatar");
      avatarGroup.selectAll("*").remove();

      if (d.photo && !d.isMe) {
        const clipId = `clip-${d.id}`;
        if (defs.select(`#${clipId}`).empty()) {
          defs
            .append("clipPath")
            .attr("id", clipId)
            .append("circle")
            .attr("r", 24);
        }

        avatarGroup
          .append("image")
          .attr("href", d.photo)
          .attr("x", -24)
          .attr("y", -24)
          .attr("width", 48)
          .attr("height", 48)
          .attr("clip-path", `url(#${clipId})`);
      } else {
        avatarGroup
          .append("text")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .style("font-size", d.isMe ? "20px" : "18px")
          .style("font-weight", "600")
          .style("fill", d.isMe ? "#FFFFFF" : "#E8A87C")
          .text(d.isMe ? "我" : d.name.charAt(0));
      }
    });

    // 更新姓名
    nodeGroupMerge
      .select<SVGTextElement>("text.node-name")
      .text((d) => d.name);

    // 更新称呼
    nodeGroupMerge
      .select<SVGTextElement>("text.node-icall")
      .text((d) => d.iCall || "");

    // 设置节点位置
    nodeGroupMerge.attr("transform", (d) => `translate(${d.x},${d.y})`);

    // ========== 拖拽行为 ==========
    const drag = d3
      .drag<SVGGElement, GraphNode>()
      .on("start", function (event, d) {
        const transform = d3.select(this).attr("transform");
        const match = transform?.match(/translate\(([^,]+),([^)]+)\)/);
        if (match) {
          const currentX = parseFloat(match[1]);
          const currentY = parseFloat(match[2]);
          d.dragOffsetX = currentX - event.x;
          d.dragOffsetY = currentY - event.y;
        } else {
          d.dragOffsetX = 0;
          d.dragOffsetY = 0;
        }
      })
      .on("drag", function (event, d) {
        const newX = event.x + (d.dragOffsetX || 0);
        const newY = event.y + (d.dragOffsetY || 0);

        d.x = newX;
        d.y = newY;

        // 更新当前节点位置
        d3.select(this).attr("transform", `translate(${newX},${newY})`);

        // 更新与该节点相关的所有连线
        const nodeId = d.id;
        g.selectAll<SVGGElement, GraphLink>("g.link-group").each(function (l) {
          const sourceId = (l.source as GraphNode).id;
          const targetId = (l.target as GraphNode).id;

          if (sourceId === nodeId || targetId === nodeId) {
            const group = d3.select(this);
            const sourceNode = layoutNodes.find((n) => n.id === sourceId)!;
            const targetNode = layoutNodes.find((n) => n.id === targetId)!;

            group
              .select("line.link-line")
              .attr("x1", sourceNode.x!)
              .attr("y1", sourceNode.y!)
              .attr("x2", targetNode.x!)
              .attr("y2", targetNode.y!);

            if (!l.label) return;

            const midX = (sourceNode.x! + targetNode.x!) / 2;
            const midY = (sourceNode.y! + targetNode.y!) / 2;
            group.select("text.link-label").attr("x", midX).attr("y", midY);

            const text = group.select("text.link-label").node() as SVGTextElement;
            const bbox = text?.getBBox();
            if (bbox) {
              const padding = 6;
              group
                .select("rect.link-label-bg")
                .attr("x", midX - bbox.width / 2 - padding)
                .attr("y", midY - bbox.height / 2 - padding + 1);
            }
          }
        });
      })
      .on("end", function (_event, d) {
        delete d.dragOffsetX;
        delete d.dragOffsetY;
        // 保存拖拽后的位置
        if (d.x !== undefined && d.y !== undefined) {
          nodePositionsRef.current.set(d.id, { x: d.x, y: d.y });
        }
      });

    nodeGroupMerge.call(drag as any);
  }, [selectedId, onNodeClick]);

  // 首次挂载初始化
  useEffect(() => {
    initGraph();
  }, [initGraph]);

  // 监听 nodes 和 links 变化
  useEffect(() => {
    const nodesSig = JSON.stringify(nodes.map(n => n.id));
    const linksSig = JSON.stringify(links.map(l => l.id));

    if (nodesSig !== nodesSignatureRef.current || linksSig !== linksSignatureRef.current) {
      nodesSignatureRef.current = nodesSig;
      linksSignatureRef.current = linksSig;
      if (isInitializedRef.current) {
        updateGraph(nodes, links);
      }
    }
  }, [nodes, links, updateGraph]);

  // 监听尺寸变化
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !svgRef.current) return;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
      style={{ touchAction: "none" }}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
    </div>
  );
}
