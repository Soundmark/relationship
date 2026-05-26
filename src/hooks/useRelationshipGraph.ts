import { useState, useEffect, useCallback } from "react";
import { db } from "@/db";

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
      const graphLinks: GraphLink[] = relationships.map((rel) => ({
        id: rel.id,
        source: rel.fromPersonId,
        target: rel.toPersonId,
        label: rel.relationLabel,
      }));

      // 添加"我"与其他人的关系边
      // 根据每个人员的 iCall（我称呼对方）建立关系
      persons.forEach((person) => {
        if (person.iCall) {
          // 我 -> 对方，关系标签是我对对方的称呼
          graphLinks.push({
            id: `me-to-${person.id}`,
            source: "me",
            target: person.id,
            label: person.iCall,
          });
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
