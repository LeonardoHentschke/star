import { Inject, Injectable } from '@nestjs/common';
import { DocumentNotFoundError } from '../../../documents/domain/errors/document-domain.errors';
import {
  isItemDone,
  itemMatchesDateFilter,
  linesChanged,
  linkedPullRequests,
} from '../../domain/dashboard-item-status';
import { DashboardSummaryDto, DashboardSummaryQueryDto, DashboardTopItemDto } from '../dto/dashboard.dto';
import {
  DASHBOARD_QUERY,
  DashboardDocumentItem,
  DashboardQueryPort,
} from '../ports/dashboard-query.port';

const TOP_ITEMS_LIMIT = 8;

@Injectable()
export class GetDashboardSummaryUseCase {
  constructor(
    @Inject(DASHBOARD_QUERY) private readonly dashboardQuery: DashboardQueryPort,
  ) {}

  async execute(query: DashboardSummaryQueryDto): Promise<DashboardSummaryDto> {
    const document = await this.dashboardQuery.findDocumentById(query.documentId);
    if (!document) throw new DocumentNotFoundError(query.documentId);

    const items = document.items.filter((item) =>
      itemMatchesDateFilter(item, query.periodStart, query.periodEnd),
    );

    const doneItems = items.filter(isItemDone);
    const totalAdditions = items.reduce((sum, item) => sum + item.additions, 0);
    const totalDeletions = items.reduce((sum, item) => sum + item.deletions, 0);

    const ranked = [...items].sort((a, b) => linesChanged(b) - linesChanged(a));
    const top = ranked[0];

    return {
      document: {
        id: document.id,
        title: document.title,
        periodStart: document.periodStart,
        periodEnd: document.periodEnd,
      },
      filter: { periodStart: query.periodStart ?? null, periodEnd: query.periodEnd ?? null },
      totals: {
        itemsCount: items.length,
        doneItemsCount: doneItems.length,
        completionRate: items.length > 0 ? doneItems.length / items.length : 0,
        totalAdditions,
        totalDeletions,
        totalLinesChanged: totalAdditions + totalDeletions,
      },
      topItemByLinesChanged: top && linesChanged(top) > 0 ? this.toTopItemDto(top) : null,
      byStatus: this.byStatus(items),
      topItemsByLinesChanged: ranked
        .filter((item) => linesChanged(item) > 0)
        .slice(0, TOP_ITEMS_LIMIT)
        .map((item) => this.toTopItemDto(item)),
      completedOverTime: this.completedOverTime(items),
      prCycleTime: this.prCycleTime(items),
    };
  }

  private toTopItemDto(item: DashboardDocumentItem): DashboardTopItemDto {
    return {
      itemId: item.id,
      title: item.sourceTitle,
      url: item.sourceUrl,
      sourceType: item.sourceType,
      additions: item.additions,
      deletions: item.deletions,
      linesChanged: linesChanged(item),
    };
  }

  // Agrupa por status real do item: texto do status do Jira (workflow-specific,
  // ex: "To Do"/"In Progress"/"In Review"/"Done") ou, para PRs sem Jira vinculado,
  // "Aberta"/"Mesclada" a partir de `merged`.
  private byStatus(items: DashboardDocumentItem[]): { status: string; itemsCount: number }[] {
    const counts = new Map<string, number>();
    for (const item of items) {
      const status =
        item.sourceType === 'jira'
          ? (item.jiraStatus ?? 'Sem status')
          : item.merged
            ? 'Mesclada'
            : 'Aberta';
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    return [...counts.entries()].map(([status, itemsCount]) => ({ status, itemsCount }));
  }

  // Agrupa por mês do `mergedAt` da PR mergeada de cada item concluído (mesma
  // fonte de dado que `prCycleTime` já usa). Com um único documento, agrupar
  // por período do documento (como antes) sempre daria um ponto só — isso
  // mostra a evolução real dentro do próprio documento quando ele cobre mais
  // de um mês. Itens concluídos sem PR mergeada com data não entram aqui.
  private completedOverTime(items: DashboardDocumentItem[]): { month: string; doneCount: number }[] {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!isItemDone(item)) continue;

      const mergedDates = linkedPullRequests(item)
        .filter((pr) => pr.merged && pr.mergedAt)
        .map((pr) => pr.mergedAt as string);
      if (mergedDates.length === 0) continue;

      const month = [...mergedDates].sort().at(-1)!.slice(0, 7); // "YYYY-MM"
      counts.set(month, (counts.get(month) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, doneCount]) => ({ month, doneCount }));
  }

  private prCycleTime(items: DashboardDocumentItem[]): { averageDays: number | null; sampleSize: number } {
    const days: number[] = [];
    for (const item of items) {
      for (const pr of linkedPullRequests(item)) {
        if (!pr.merged || !pr.mergedAt) continue;
        const created = new Date(pr.createdAt).getTime();
        const merged = new Date(pr.mergedAt).getTime();
        if (Number.isNaN(created) || Number.isNaN(merged)) continue;
        days.push((merged - created) / (1000 * 60 * 60 * 24));
      }
    }
    if (days.length === 0) return { averageDays: null, sampleSize: 0 };
    return { averageDays: days.reduce((sum, d) => sum + d, 0) / days.length, sampleSize: days.length };
  }
}
