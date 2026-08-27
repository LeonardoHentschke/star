import { Document } from './document.entity';

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
}

export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');
