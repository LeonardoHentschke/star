import { Document } from '../domain/document.entity';

/**
 * A camada de apresentação nunca serializa a entidade de domínio
 * diretamente (ela tem métodos e invariantes que não fazem sentido
 * expor). O Presenter converte para um shape simples de JSON.
 */
export class DocumentPresenter {
  static toSummary(document: Document) {
    return {
      id: document.id,
      title: document.title,
      periodStart: document.period.start,
      periodEnd: document.period.end,
      createdAt: document.createdAt,
    };
  }

  static toDetail(document: Document) {
    return {
      ...this.toSummary(document),
      executiveSummary: document.executiveSummary,
      items: document.items.map((item) => ({
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
      })),
    };
  }
}
