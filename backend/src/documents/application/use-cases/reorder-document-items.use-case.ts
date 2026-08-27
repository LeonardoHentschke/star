import { Inject, Injectable } from '@nestjs/common';
import { Document } from '../../domain/document.entity';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentNotFoundError } from '../../domain/errors/document-domain.errors';

/**
 * Carrega o agregado Document inteiro para reordenar os itens — mesma
 * lógica de consistência aplicada em UpdateDocumentItemUseCase.
 */
@Injectable()
export class ReorderDocumentItemsUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
  ) {}

  async execute(documentId: string, itemIds: string[]): Promise<Document> {
    const document = await this.repo.findById(documentId);
    if (!document) throw new DocumentNotFoundError(documentId);

    document.reorderItems(itemIds);

    await this.repo.save(document);
    return document;
  }
}
