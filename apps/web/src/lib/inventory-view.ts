import { listMovements, type MovementRow } from "./repositories";

export { listMovements };

export function oneName(value: MovementRow["products"]): string {
  if (!value) return "—";
  return Array.isArray(value) ? (value[0]?.name ?? "—") : value.name;
}
