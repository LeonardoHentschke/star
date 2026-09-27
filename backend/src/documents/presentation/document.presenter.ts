import { Document } from '../domain/document.entity';
import { DocumentItem } from '../domain/document-item.entity';

export class DocumentPresenter {
  static toSummary(document: Document) {
    return {
      id: document.id,
      title: document.title,
      periodStart: document.period.start,
      periodEnd: document.period.end,
      createdAt: document.createdAt,
      favorite: document.favorite,
      jobStatus: document.jobStatus,
      jobType: document.jobType,
      jobError: document.jobError,
      jobProgress: document.jobProgress,
    };
  }

  static toDetail(document: Document) {
    return {
      ...this.toSummary(document),
      executiveSummary: document.executiveSummary,
      items: document.items.map((item) => this.toItem(item)),
    };
  }

  static toItem(item: DocumentItem) {
    return {
      id: item.id,
      sourceType: item.source.sourceType,
      sourceRef: item.source.sourceRef,
      sourceTitle: item.source.title,
      sourceUrl: item.source.url,
      pullRequests: (item.source.rawSnapshot?.pullRequests as unknown[] | undefined) ?? [],
      situation: item.star.situation,
      task: item.star.task,
      action: item.star.action,
      result: item.star.result,
    };
  }
}
