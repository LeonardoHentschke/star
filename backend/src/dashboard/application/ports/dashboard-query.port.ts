import { DashboardItem } from '../../domain/dashboard-item-status';

export interface DashboardDocumentItem extends DashboardItem {
  id: string;
  documentId: string;
  sourceRef: string;
  sourceTitle: string;
  sourceUrl: string | null;
}

export interface DashboardDocument {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  items: DashboardDocumentItem[];
}

/**
 * Porta de leitura para o dashboard: consulta direto o read model
 * (ORM) em vez de reconstruir o agregado `Document`, já que é usado
 * só para relatórios agregados (CQRS leve — escritas continuam
 * passando pelo `DocumentRepository`/agregado).
 */
export interface DashboardQueryPort {
  findDocumentById(documentId: string): Promise<DashboardDocument | null>;
}

export const DASHBOARD_QUERY = Symbol('DASHBOARD_QUERY');
