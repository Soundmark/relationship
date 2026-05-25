import { useState, useEffect, useCallback } from "react";
import { db } from "@/db";

export interface GraphNode {
  id: string;
  name: string;
  photo?: string;
  iCall?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
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

      // 构建边
      const graphLinks: GraphLink[] = relationships.map((rel) => ({
        id: rel.id,
        source: rel.fromPersonId,
        target: rel.toPersonId,
        label: rel.relationLabel,
      }));

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
