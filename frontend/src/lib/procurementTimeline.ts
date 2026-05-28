export const PROCUREMENT_TYPES = ['Định kỳ', 'Đột xuất'] as const;

export type ProcurementType = (typeof PROCUREMENT_TYPES)[number];

export function normalizeProcurementYear(value?: number | string): number {
  const year = Number(value) || new Date().getFullYear();
  return Math.min(Math.max(Math.trunc(year), 2020), 2100);
}

export function getAnnualProcurementDeadlines(yearValue?: number | string) {
  const year = normalizeProcurementYear(yearValue);
  return {
    noticeDeadline: new Date(year, 0, 15, 23, 59, 59, 999),
    requestDeadline: new Date(year, 0, 30, 23, 59, 59, 999),
    planDeadline: new Date(year, 2, 1, 23, 59, 59, 999),
  };
}

export function isAnnualProcurement(type?: string): boolean {
  return type === 'Định kỳ';
}
