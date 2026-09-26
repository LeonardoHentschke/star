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

export interface DocumentRepository {
  save(document: Document): Promise<void>;
  findById(id: string): Promise<Document | null>;
  findAll(): Promise<Document[]>;
  delete(id: string): Promise<void>;
  clearFavorite(): Promise<void>;
  updateJobState(id: string, state: DocumentJobStateUpdate): Promise<boolean>;
  failAllProcessingJobs(message: string): Promise<void>;
  saveItem(documentId: string, item: DocumentItem): Promise<boolean>;
}

export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');
