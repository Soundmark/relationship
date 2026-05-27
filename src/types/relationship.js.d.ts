declare module "relationship.js" {
  interface RelationshipOptions {
    text: string;
    target?: string;
    sex?: -1 | 0 | 1;
    type?: "default" | "chain" | "pair";
    reverse?: boolean;
    mode?: string;
    optimal?: boolean;
  }

  export function setMode(
    name: string,
    data: Record<string, string[]>
  ): void;

  export default function relationship(
    options: RelationshipOptions
  ): string[];
}
