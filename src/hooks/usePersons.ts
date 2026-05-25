import { useState, useEffect, useCallback } from "react";
import type { Person } from "@/types";
import { db } from "@/db";

export function usePersons() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const all = await db.persons.toArray();
    setPersons(all.sort((a, b) => b.createdAt - a.createdAt));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addPerson = useCallback(
    async (data: Omit<Person, "id" | "createdAt" | "updatedAt">) => {
      const now = Date.now();
      const person: Person = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      await db.persons.add(person);
      setPersons((prev) =>
        [{ ...person }, ...prev].sort((a, b) => b.createdAt - a.createdAt),
      );
      return person;
    },
    [],
  );

  const deletePerson = useCallback(async (id: string) => {
    // Delete person and their relationships in a transaction
    await db.transaction("rw", db.persons, db.relationships, async () => {
      // Delete the person
      await db.persons.delete(id);
      // Delete all relationships involving this person
      await db.relationships
        .where("fromPersonId")
        .equals(id)
        .delete();
      await db.relationships
        .where("toPersonId")
        .equals(id)
        .delete();
    });
    setPersons((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePerson = useCallback(
    async (id: string, data: Partial<Omit<Person, "id" | "createdAt">>) => {
      const updates = { ...data, updatedAt: Date.now() };
      await db.persons.update(id, updates);
      setPersons((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      );
    },
    [],
  );

  return { persons, loading, addPerson, deletePerson, updatePerson, refresh };
}
