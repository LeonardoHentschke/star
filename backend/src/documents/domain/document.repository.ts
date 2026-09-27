import { Document, DocumentJobStatus, DocumentJobType } from './document.entity';
import { DocumentItem } from './document-item.entity';

export interface DocumentJobStateUpdate {
  jobStatus?: DocumentJobStatus;
  jobType?: DocumentJobType | null;
  jobError?: string | null;
  jobProgressDone?: number | null;
  jobProgressTotal?: number | null;
  jobPayload?: Record<string, unknown> | null;
}

export interface DocumentItemsPage {
  document: Document;
  totalItems: number;
}

export interface DocumentStats {
  itemCount: number;
  generatedCount: number;
  pullRequestCount: number;
}

export interface DocumentRepository {
  save(document: Document): Promise<void>;
  findById(id: string): Promise<Document | null>;
  findByIdWithItemsPage(id: string, offset: number, limit: number): Promise<DocumentItemsPage | null>;
  findAll(): Promise<Document[]>;
  findAllStats(): Promise<Map<string, DocumentStats>>;
  delete(id: string): Promise<void>;
  clearFavorite(): Promise<void>;
  updateJobState(id: string, state: DocumentJobStateUpdate): Promise<boolean>;
  failAllProcessingJobs(message: string): Promise<void>;
  saveItem(documentId: string, item: DocumentItem): Promise<boolean>;
}

export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');
