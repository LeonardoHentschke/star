// GET /dashboard/summary?documentId&periodStart&periodEnd — documentId obrigatório, período opcional ("YYYY-MM-DD")
export interface DashboardSummaryQueryDto {
  documentId: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface DashboardTopItemDto {
  itemId: string;
  title: string;
  url: string | null;
  sourceType: 'jira' | 'github_pr';
  additions: number;
  deletions: number;
  linesChanged: number;
}

export interface DashboardSummaryDto {
  document: { id: string; title: string; periodStart: string; periodEnd: string };
  filter: { periodStart: string | null; periodEnd: string | null };
  totals: {
    itemsCount: number;
    doneItemsCount: number;
    completionRate: number;
    totalAdditions: number;
    totalDeletions: number;
    totalLinesChanged: number;
  };
  topItemByLinesChanged: DashboardTopItemDto | null;
  byStatus: { status: string; itemsCount: number }[];
  topItemsByLinesChanged: DashboardTopItemDto[];
  completedOverTime: { month: string; doneCount: number }[];
  prCycleTime: { averageDays: number | null; sampleSize: number };
}
