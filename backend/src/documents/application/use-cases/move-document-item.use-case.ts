import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentNotFoundError } from '../../domain/errors/document-domain.errors';

@Injectable()
export class MoveDocumentItemUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
  ) {}

  async execute(documentId: string, itemId: string, direction: 'up' | 'down'): Promise<void> {
    const document = await this.repo.findById(documentId);
    if (!document) throw new DocumentNotFoundError(documentId);

    const changedItems = document.moveItem(itemId, direction);
    for (const item of changedItems) {
      await this.repo.saveItem(documentId, item);
    }
  }
}
