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

export interface Relationship {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  relationLabel: string;
}
