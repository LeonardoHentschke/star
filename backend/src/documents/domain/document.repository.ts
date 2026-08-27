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

/**
 * Porta (interface) do repositório de Document, definida no domínio.
 * A implementação concreta (TypeORM) vive em infrastructure/persistence
 * e é injetada via token DI — o domínio e os casos de uso nunca dependem
 * do TypeORM diretamente.
 */
export interface DocumentRepository {
  save(document: Document): Promise<void>;
  findById(id: string): Promise<Document | null>;
  findAll(): Promise<Document[]>;
  delete(id: string): Promise<void>;
  // Desmarca qualquer documento atualmente favorito — garante que só existe
  // um favorito por vez (flag global, sem conceito de usuário na aplicação).
  clearFavorite(): Promise<void>;
  // Atualiza só as colunas de estado do job (sem passar pelo agregado
  // completo) — usado pelos use cases assíncronos para reportar progresso
  // sem re-salvar em cascata os itens do documento a cada tick. Retorna
  // `false` se o documento não existe mais (ex: foi deletado enquanto o job
  // rodava em background) — os use cases usam isso pra não ressuscitar um
  // documento deletado com o `save()` final.
  updateJobState(id: string, state: DocumentJobStateUpdate): Promise<boolean>;
  // Recuperação para jobs que ficaram presos em "processing" porque o
  // backend reiniciou no meio do processamento (roda uma vez no boot).
  failAllProcessingJobs(message: string): Promise<void>;
  // Grava/atualiza um único item, sem re-salvar o documento inteiro em
  // cascata — usado pelos use cases assíncronos pra persistir cada item
  // assim que processado, e não perder o progresso se o job falhar no meio.
  // Retorna `false` se o documento não existe mais (mesmo contrato de
  // `updateJobState`).
  saveItem(documentId: string, item: DocumentItem): Promise<boolean>;
}

export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');
