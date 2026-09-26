export interface PullRequestSnapshot {
  merged: boolean;
  createdAt: string;
  mergedAt: string | null;
}

export interface DashboardItem {
  sourceType: 'jira' | 'github_pr';
  jiraStatus: string | null;
  jiraDone: boolean | null;
  merged: boolean | null;
  additions: number;
  deletions: number;
  rawSnapshot: Record<string, unknown> | null;
}

export function linkedPullRequests(item: DashboardItem): PullRequestSnapshot[] {
  return (item.rawSnapshot?.['pullRequests'] as PullRequestSnapshot[] | undefined) ?? [];
}

export function isItemDone(item: DashboardItem): boolean {
  if (item.sourceType === 'github_pr') return item.merged === true;

  if (item.jiraDone !== true) return false;
  const prs = linkedPullRequests(item);
  if (prs.length === 0) return true;
  return prs.every((pr) => pr.merged === true);
}

export function linesChanged(item: DashboardItem): number {
  return item.additions + item.deletions;
}

export function itemMatchesDateFilter(
  item: DashboardItem,
  periodStart?: string,
  periodEnd?: string,
): boolean {
  if (!periodStart && !periodEnd) return true;

  const prs = linkedPullRequests(item);
  if (prs.length === 0) return false;

  return prs.some((pr) =>
    [pr.createdAt, pr.mergedAt]
      .filter((date): date is string => Boolean(date))
      .some((date) => {
        const day = date.slice(0, 10);
        if (periodStart && day < periodStart) return false;
        if (periodEnd && day > periodEnd) return false;
        return true;
      }),
  );
}
