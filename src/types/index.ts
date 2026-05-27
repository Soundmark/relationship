export interface Person {
  id: string;
  name: string;
  photo?: string;
  callMe?: string;
  iCall?: string;
  phone?: string;
  birthday?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type RelationshipType = "parent-child" | "spouse" | "sibling" | "other";

export interface Relationship {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  type: RelationshipType;
}
