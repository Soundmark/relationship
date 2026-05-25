import { useState, useEffect, useCallback } from "react";
import type { Relationship, Person } from "@/types";
import { db } from "@/db";

export function useRelationships() {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const all = await db.relationships.toArray();
    setRelationships(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 获取某人的所有关系（作为起点或终点）
  const getPersonRelationships = useCallback(
    async (personId: string) => {
      const [asSource, asTarget] = await Promise.all([
        db.relationships.where("fromPersonId").equals(personId).toArray(),
        db.relationships.where("toPersonId").equals(personId).toArray(),
      ]);
      return { asSource, asTarget };
    },
    []
  );

  // 获取某人的所有关联人员（用于关系图）
  const getRelatedPersons = useCallback(
    async (personId: string): Promise<Person[]> => {
      const { asSource, asTarget } = await getPersonRelationships(personId);
      const relatedIds = new Set<string>();

      asSource.forEach((r) => relatedIds.add(r.toPersonId));
      asTarget.forEach((r) => relatedIds.add(r.fromPersonId));

      if (relatedIds.size === 0) return [];

      const persons = await db.persons
        .where("id")
        .anyOf(Array.from(relatedIds))
        .toArray();
      return persons;
    },
    [getPersonRelationships]
  );

  // 获取关系网络（用于关系图渲染）
  const getRelationNetwork = useCallback(
    async (centerPersonId: string) => {
      // 获取中心人物
      const centerPerson = await db.persons.get(centerPersonId);
      if (!centerPerson) return { nodes: [], edges: [] };

      // 获取直接关系
      const { asSource, asTarget } = await getPersonRelationships(centerPersonId);

      // 收集所有相关人员ID
      const personIds = new Set<string>([centerPersonId]);
      asSource.forEach((r) => personIds.add(r.toPersonId));
      asTarget.forEach((r) => personIds.add(r.fromPersonId));

      // 获取所有人员信息
      const persons = await db.persons
        .where("id")
        .anyOf(Array.from(personIds))
        .toArray();

      // 构建节点和边
      const nodes = persons.map((p) => ({
        id: p.id,
        name: p.name,
        photo: p.photo,
        iCall: p.iCall,
      }));

      const edges = [...asSource, ...asTarget].map((r) => ({
        id: r.id,
        source: r.fromPersonId,
        target: r.toPersonId,
        label: r.relationLabel,
      }));

      return { nodes, edges };
    },
    [getPersonRelationships]
  );

  // 添加关系
  const addRelationship = useCallback(
    async (
      fromPersonId: string,
      toPersonId: string,
      relationLabel: string
    ): Promise<Relationship> => {
      // 检查是否已存在相同关系
      const existing = await db.relationships
        .where({ fromPersonId, toPersonId, relationLabel })
        .first();

      if (existing) {
        throw new Error("该关系已存在");
      }

      const relationship: Relationship = {
        id: crypto.randomUUID(),
        fromPersonId,
        toPersonId,
        relationLabel,
      };

      await db.relationships.add(relationship);
      setRelationships((prev) => [...prev, relationship]);
      return relationship;
    },
    []
  );

  // 删除关系
  const deleteRelationship = useCallback(async (id: string) => {
    await db.relationships.delete(id);
    setRelationships((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // 删除某人的所有关系（通常在删除人员时调用）
  const deletePersonRelationships = useCallback(async (personId: string) => {
    await db.transaction("rw", db.relationships, async () => {
      await db.relationships.where("fromPersonId").equals(personId).delete();
      await db.relationships.where("toPersonId").equals(personId).delete();
    });
    setRelationships((prev) =>
      prev.filter(
        (r) => r.fromPersonId !== personId && r.toPersonId !== personId
      )
    );
  }, []);

  return {
    relationships,
    loading,
    refresh,
    getPersonRelationships,
    getRelatedPersons,
    getRelationNetwork,
    addRelationship,
    deleteRelationship,
    deletePersonRelationships,
  };
}
