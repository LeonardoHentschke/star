import { Inject, Injectable } from '@nestjs/common';
import { DocumentItem } from '../../domain/document-item.entity';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import {
  DocumentItemNotFoundError,
  DocumentJobAlreadyRunningError,
  DocumentNotFoundError,
} from '../../domain/errors/document-domain.errors';
import { AI_TEXT_GENERATOR, AiTextGeneratorPort } from '../ports/ai-text-generator.port';

@Injectable()
export class GenerateDocumentItemUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
    @Inject(AI_TEXT_GENERATOR) private readonly aiGenerator: AiTextGeneratorPort,
  ) {}

  async execute(documentId: string, itemId: string): Promise<DocumentItem> {
    const document = await this.repo.findById(documentId);
    if (!document) throw new DocumentNotFoundError(documentId);
    if (document.jobStatus === 'processing') throw new DocumentJobAlreadyRunningError(documentId);

    const item = document.items.find((i) => i.id === itemId);
    if (!item) throw new DocumentItemNotFoundError(itemId);

    const star = await this.aiGenerator.generateStarForItem(item.source);
    const updatedItem = document.applyGeneratedStarToItem(itemId, star);

    const stillExists = await this.repo.saveItem(documentId, updatedItem);
    if (!stillExists) throw new DocumentNotFoundError(documentId);
    return updatedItem;
  }
}
