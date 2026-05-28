export function isOverdue(dueDate?: string): boolean {
  return Boolean(dueDate && new Date(dueDate).getTime() < Date.now());
}

export function countOverdue<T extends { dueDate?: string; status: string }>(
  items: T[],
  status: string,
): number {
  return items.filter((item) => item.status === status && isOverdue(item.dueDate)).length;
}
