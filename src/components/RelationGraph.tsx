import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import type { GraphNode, GraphLink } from "@/hooks/useRelationshipGraph";

interface RelationGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedId?: string;
  onNodeClick?: (node: GraphNode) => void;
}

export function RelationGraph({
  nodes,
  links,
  selectedId,
  onNodeClick,
}: RelationGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, undefined> | null>(null);
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

    // 定义箭头标记和裁剪路径的 defs
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

  // 更新图表（使用 data join）
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

    // 深拷贝节点数据，恢复之前的位置
    const simulationNodes: GraphNode[] = currentNodes.map((n) => {
      const savedPos = nodePositionsRef.current.get(n.id);
      return {
        ...n,
        x: savedPos?.x,
        y: savedPos?.y,
        fx: savedPos?.x,
        fy: savedPos?.y,
      };
    });

    // 深拷贝连线数据，并将 source/target 解析为节点对象
    const simulationLinks: GraphLink[] = currentLinks.map((l) => ({
      ...l,
      source: simulationNodes.find((n) => n.id === l.source) || l.source,
      target: simulationNodes.find((n) => n.id === l.target) || l.target,
    }));

    // 检查是否是首次布局（没有保存任何位置）
    const hasAnySavedPositions = simulationNodes.some((n) =>
      nodePositionsRef.current.has(n.id)
    );
    const isFirstLayout = !hasAnySavedPositions;

    // 首次布局时给节点初始位置
    if (isFirstLayout) {
      const meNode = simulationNodes.find((n) => n.isMe);
      if (meNode) {
        meNode.x = width / 2;
        meNode.y = height / 2;
        meNode.fx = width / 2;
        meNode.fy = height / 2;
      }
      // 给其他节点一个围绕中心的初始位置（避免堆叠在左上角）
      simulationNodes.forEach((node, i) => {
        if (!node.isMe && node.x === undefined) {
          const angle = (i / simulationNodes.length) * 2 * Math.PI;
          const radius = 150;
          node.x = width / 2 + radius * Math.cos(angle);
          node.y = height / 2 + radius * Math.sin(angle);
        }
      });
    }

    // 准备 defs
    const svg = d3.select(svgRef.current);
    const defs = svg.select("defs").empty()
      ? svg.append("defs")
      : svg.select("defs");

    // 更新箭头标记
    if (defs.select("#arrowhead").empty()) {
      defs
        .append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 45)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#E8DED0");
    }

    // ========== 连线的 data join ==========
    const linkGroup = g
      .selectAll<SVGGElement, GraphLink>("g.link-group")
      .data(simulationLinks, (d: any) => d.id);

    // 移除旧连线
    linkGroup.exit().remove();

    // 添加新连线
    const linkGroupEnter = linkGroup
      .enter()
      .append("g")
      .attr("class", "link-group");

    linkGroupEnter.append("line").attr("class", "link-line");
    linkGroupEnter.append("rect").attr("class", "link-label-bg");
    linkGroupEnter.append("text").attr("class", "link-label");

    // 合并并更新所有连线
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

    // 计算标签背景尺寸并设置连线和标签的初始位置
    linkGroupMerge.each(function (d) {
      const group = d3.select(this);
      const source = d.source as GraphNode;
      const target = d.target as GraphNode;

      // 设置连线位置
      group
        .select("line.link-line")
        .attr("x1", source.x!)
        .attr("y1", source.y!)
        .attr("x2", target.x!)
        .attr("y2", target.y!);

      // 设置标签位置
      const midX = (source.x! + target.x!) / 2;
      const midY = (source.y! + target.y!) / 2;
      group.select("text.link-label").attr("x", midX).attr("y", midY);

      // 设置标签背景
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
      .data(simulationNodes, (d: any) => d.id);

    // 移除旧节点
    nodeGroup.exit().remove();

    // 添加新节点
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
      .attr("r", (d) => (d.isMe ? 32 : 28)) // "我"的节点稍大
      .attr("fill", (d) => (d.isMe ? "#E8A87C" : "#FFFFFF")) // "我"的节点使用主题色
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

    // 称呼
    nodeGroupEnter
      .append("text")
      .attr("class", "node-icall")
      .attr("text-anchor", "middle")
      .attr("y", 56)
      .style("font-size", "10px")
      .style("fill", "#8B7355");

    // 合并并更新所有节点
    const nodeGroupMerge = nodeGroupEnter.merge(nodeGroup as any);

    // 更新节点样式（选中状态）
    nodeGroupMerge
      .select<SVGCircleElement>("circle.node-circle")
      .attr("stroke", (d) => {
        if (d.isMe) return "#C17F59"; // "我"的节点使用深一点的边框
        return d.id === selectedId ? "#E8A87C" : "#E8DED0";
      })
      .attr("stroke-width", (d) => (d.id === selectedId || d.isMe ? 3 : 2));

    // 更新头像/首字母
    nodeGroupMerge.each(function (d) {
      const node = d3.select(this);
      const avatarGroup = node.select("g.node-avatar");
      avatarGroup.selectAll("*").remove();

      if (d.photo && !d.isMe) {
        // 创建裁剪路径（非"我"的节点）
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
        // "我"的节点显示"我"字，其他节点显示首字母
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

    // ========== 拖拽行为 ==========
    const drag = d3
      .drag<SVGGElement, GraphNode>()
      .on("start", function (event, d) {
        // 解锁位置
        d.fx = null;
        d.fy = null;
        // 记录拖拽开始时的偏移量
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
        // 计算新位置（考虑偏移）
        const newX = event.x + (d.dragOffsetX || 0);
        const newY = event.y + (d.dragOffsetY || 0);

        d.x = newX;
        d.y = newY;
        d.fx = newX;
        d.fy = newY;

        // 更新当前节点位置（使用 this 确保准确性）
        d3.select(this).attr("transform", `translate(${newX},${newY})`);

        // 更新与该节点相关的所有连线
        const nodeId = d.id;
        g.selectAll<SVGGElement, GraphLink>("g.link-group").each(function (l) {
          const sourceId = (l.source as GraphNode).id;
          const targetId = (l.target as GraphNode).id;

          if (sourceId === nodeId || targetId === nodeId) {
            const group = d3.select(this);

            // 获取源和目标节点的当前位置
            const sourceNode = simulationNodes.find((n) => n.id === sourceId)!;
            const targetNode = simulationNodes.find((n) => n.id === targetId)!;

            // 更新连线
            group
              .select("line.link-line")
              .attr("x1", sourceNode.x!)
              .attr("y1", sourceNode.y!)
              .attr("x2", targetNode.x!)
              .attr("y2", targetNode.y!);

            // 更新标签位置
            const midX = (sourceNode.x! + targetNode.x!) / 2;
            const midY = (sourceNode.y! + targetNode.y!) / 2;
            group.select("text.link-label").attr("x", midX).attr("y", midY);

            // 更新标签背景
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
        // 清理偏移量
        delete d.dragOffsetX;
        delete d.dragOffsetY;
        // 保存位置
        if (d.x !== undefined && d.y !== undefined) {
          nodePositionsRef.current.set(d.id, { x: d.x, y: d.y });
        }
      });

    nodeGroupMerge.call(drag as any);

    // ========== 力导向仿真 ==========
    // 停止之前的仿真
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // 创建新仿真
    const simulation = d3
      .forceSimulation<GraphNode>(simulationNodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(simulationLinks)
          .id((d) => d.id)
          .distance(130)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));

    simulationRef.current = simulation;

    // 如果是首次布局，等待仿真稳定
    if (isFirstLayout) {
      // 立即执行一次 tick 更新初始位置
      nodeGroupMerge.attr("transform", (d) => `translate(${d.x},${d.y})`);

      simulation.on("end", () => {
        // 保存最终位置并锁定
        simulationNodes.forEach((node) => {
          if (node.x !== undefined && node.y !== undefined) {
            nodePositionsRef.current.set(node.id, { x: node.x, y: node.y });
            node.fx = node.x;
            node.fy = node.y;
          }
        });
      });
    } else {
      // 已有位置，直接停止仿真（冻结布局）
      simulation.stop();
      // 手动触发一次 tick 更新，确保节点位置正确应用
      // 更新节点位置
      nodeGroupMerge.attr("transform", (d) => `translate(${d.x},${d.y})`);
      // 更新连线
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
            .attr("y", midY - bbox.height / 2 - padding + 1);
        }
      });
    }

    // 仿真 tick 更新（仅在仿真运行时）
    simulation.on("tick", () => {
      // 更新节点位置
      nodeGroupMerge.attr("transform", (d) => `translate(${d.x},${d.y})`);

      // 更新连线
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
            .attr("y", midY - bbox.height / 2 - padding + 1);
        }
      });
    });
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
      // 尺寸变化时不重新布局，只调整 SVG 大小
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      // 停止仿真避免内存泄漏
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
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
