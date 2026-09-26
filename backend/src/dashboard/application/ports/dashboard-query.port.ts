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

export interface DashboardQueryPort {
  findDocumentById(documentId: string): Promise<DashboardDocument | null>;
}

export const DASHBOARD_QUERY = Symbol('DASHBOARD_QUERY');
