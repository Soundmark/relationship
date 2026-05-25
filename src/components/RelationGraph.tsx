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
  const updateGraph = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !gRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const g = gRef.current;

    // 如果没有节点，显示空状态
    if (nodes.length === 0) {
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
    const simulationNodes: GraphNode[] = nodes.map((n) => {
      const savedPos = nodePositionsRef.current.get(n.id);
      return {
        ...n,
        x: savedPos?.x,
        y: savedPos?.y,
        fx: savedPos?.x,
        fy: savedPos?.y,
      };
    });

    // 深拷贝连线数据
    const simulationLinks: GraphLink[] = links.map((l) => ({ ...l }));

    // 检查是否是首次布局（没有保存任何位置）
    const hasAnySavedPositions = simulationNodes.some((n) =>
      nodePositionsRef.current.has(n.id)
    );
    const isFirstLayout = !hasAnySavedPositions;

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

    // 计算标签背景尺寸
    linkGroupMerge.each(function () {
      const group = d3.select(this);
      const text = group.select("text.link-label").node() as SVGTextElement;
      const bbox = text?.getBBox();
      if (bbox) {
        const padding = 6;
        group
          .select("rect.link-label-bg")
          .attr("x", -bbox.width / 2 - padding)
          .attr("y", -bbox.height / 2 - padding + 1)
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
      .attr("r", 28)
      .attr("fill", "#FFFFFF")
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
      .attr("stroke", (d) => (d.id === selectedId ? "#E8A87C" : "#E8DED0"))
      .attr("stroke-width", (d) => (d.id === selectedId ? 3 : 2));

    // 更新头像/首字母
    nodeGroupMerge.each(function (d) {
      const node = d3.select(this);
      const avatarGroup = node.select("g.node-avatar");
      avatarGroup.selectAll("*").remove();

      if (d.photo) {
        // 创建裁剪路径
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
          .style("font-size", "18px")
          .style("font-weight", "600")
          .style("fill", "#E8A87C")
          .text(d.name.charAt(0));
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
      .on("start", (_event, d) => {
        // 解锁位置
        d.fx = null;
        d.fy = null;
      })
      .on("drag", (event, d) => {
        d.x = event.x;
        d.y = event.y;
        d.fx = event.x;
        d.fy = event.y;

        // 更新节点位置
        d3.select(event.sourceEvent.target.closest("g.node-group")).attr(
          "transform",
          `translate(${d.x},${d.y})`
        );

        // 更新相关连线
        const sourceLinks = simulationLinks.filter(
          (l) => (l.source as GraphNode).id === d.id
        );
        const targetLinks = simulationLinks.filter(
          (l) => (l.target as GraphNode).id === d.id
        );

        g.selectAll<SVGGElement, GraphLink>("g.link-group").each(function (l) {
          const isSource = (l.source as GraphNode).id === d.id;
          const isTarget = (l.target as GraphNode).id === d.id;

          if (isSource || isTarget) {
            const group = d3.select(this);
            const sourceNode = isSource ? d : (l.source as GraphNode);
            const targetNode = isTarget ? d : (l.target as GraphNode);

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
      .on("end", (_event, d) => {
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
    }

    // 仿真 tick 更新
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
  }, [nodes, links, selectedId, onNodeClick]);

  // 首次挂载初始化
  useEffect(() => {
    initGraph();
  }, [initGraph]);

  // 数据变化时更新图表
  useEffect(() => {
    if (isInitializedRef.current) {
      updateGraph();
    }
  }, [updateGraph]);

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
