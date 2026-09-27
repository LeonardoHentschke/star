import { Inject, Injectable } from '@nestjs/common';
import { DocumentItem } from '../../domain/document-item.entity';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentNotFoundError } from '../../domain/errors/document-domain.errors';
import { UpdateDocumentItemDto } from '../dto/document.dto';

@Injectable()
export class UpdateDocumentItemUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
  ) {}

  async execute(documentId: string, itemId: string, dto: UpdateDocumentItemDto): Promise<DocumentItem> {
    const document = await this.repo.findById(documentId);
    if (!document) throw new DocumentNotFoundError(documentId);

    const item = document.editItemStar(itemId, {
      situation: dto.situation,
      task: dto.task,
      action: dto.action,
      result: dto.result,
    });

    await this.repo.saveItem(documentId, item);
    return item;
  }
}
