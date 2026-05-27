import { useState, useEffect, useCallback } from "react";
import { db } from "@/db";
import type { RelationshipType } from "@/types";

export interface GraphNode {
  id: string;
  name: string;
  photo?: string;
  iCall?: string;
  isMe?: boolean; // 标记是否是"我"
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  dragOffsetX?: number;
  dragOffsetY?: number;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
}

export function useRelationshipGraph() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGraphData = useCallback(async () => {
    setLoading(true);
    try {
      // 并行获取所有人员和关系
      const [persons, relationships] = await Promise.all([
        db.persons.toArray(),
        db.relationships.toArray(),
      ]);

      // 构建节点
      const graphNodes: GraphNode[] = persons.map((person) => ({
        id: person.id,
        name: person.name,
        photo: person.photo,
        iCall: person.iCall,
      }));

      // 添加"我"的节点（固定在中心）
      const meNode: GraphNode = {
        id: "me",
        name: "我",
        isMe: true,
        // 初始位置会在组件中设置为中心
      };
      graphNodes.unshift(meNode);

      // 构建边
      const graphLinks: GraphLink[] = [];

      // 关系类型中文映射
      const typeLabelMap: Record<string, string> = {
        "parent-child": "子女",
        spouse: "夫妻",
        sibling: "兄弟姐妹",
        other: "其他",
      };

      // 第1步：添加"我"→所有人的边（不显示标签）
      persons.forEach((person) => {
        if (person.iCall) {
          graphLinks.push({
            id: `me-to-${person.id}`,
            source: "me",
            target: person.id,
            label: "",
          });
        }
      });

      // 第2步：添加人员之间的关系边，处理层级
      relationships.forEach((rel) => {
        // 检查两端节点都在图中
        const sourceInGraph = graphNodes.some((n) => n.id === rel.fromPersonId);
        const targetInGraph = graphNodes.some((n) => n.id === rel.toPersonId);
        if (!sourceInGraph || !targetInGraph) return;

        // 添加关系边，显示类型中文名
        graphLinks.push({
          id: `rel-${rel.id}`,
          source: rel.fromPersonId,
          target: rel.toPersonId,
          label: typeLabelMap[rel.type] || "其他",
        });

        // 如果是亲子关系：子级连接我，亲长通过子级连接 → 删除我→亲长的直连边
        if (rel.type === "parent-child") {
          const meToParentIndex = graphLinks.findIndex(
            (l) => l.source === "me" && l.target === rel.fromPersonId
          );
          if (meToParentIndex !== -1) {
            graphLinks.splice(meToParentIndex, 1);
          }
        }
      });

      setNodes(graphNodes);
      setLinks(graphLinks);
    } catch (error) {
      console.error("Failed to load graph data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  return {
    nodes,
    links,
    loading,
    refresh: loadGraphData,
  };
}
