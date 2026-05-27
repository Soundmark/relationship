import Dexie from "dexie";
import type { Person, Relationship } from "@/types";

class RelationshipDB extends Dexie {
  persons!: Dexie.Table<Person, string>;
  relationships!: Dexie.Table<Relationship, string>;

  constructor() {
    super("RelationshipDB");
    this.version(2).stores({
      persons: "id, name, createdAt",
      relationships: "id, fromPersonId, toPersonId, type",
    });
    this.version(1).stores({
      persons: "id, name, createdAt",
      relationships: "id, fromPersonId, toPersonId",
    });
  }
}

export const db = new RelationshipDB();
