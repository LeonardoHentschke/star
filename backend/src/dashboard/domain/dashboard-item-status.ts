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

// "Tarefa feita" = Jira na categoria de status "done" E (se houver PRs
// vinculadas) todas mergeadas no GitHub. `jiraDone` já vem calculado a
// partir de `statusCategory` do Jira (não do texto do status, que é
// customizável por workflow/idioma). Para itens que são uma PR direta
// (sem Jira), feita = PR mergeada.
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

// Filtro de data opcional dentro de um documento: a maioria dos itens não tem
// data própria — só as PRs linkadas têm (`createdAt`/`mergedAt`). Um item passa
// se nenhum filtro foi informado, ou se pelo menos uma data de suas PRs cai no
// intervalo. Itens sem PR linkada (ex: tarefa Jira sem PR) não têm nenhuma data
// conhecida, então são excluídos sempre que um filtro é aplicado — não dá pra
// confirmar que estão dentro do período.
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
        const day = date.slice(0, 10); // "YYYY-MM-DD"
        if (periodStart && day < periodStart) return false;
        if (periodEnd && day > periodEnd) return false;
        return true;
      }),
  );
}
