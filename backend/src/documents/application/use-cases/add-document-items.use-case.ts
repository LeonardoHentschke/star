import { Inject, Injectable } from '@nestjs/common';
import { Document } from '../../domain/document.entity';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentNotFoundError } from '../../domain/errors/document-domain.errors';
import { SourceReference } from '../../domain/value-objects/source-reference.vo';
import { AddDocumentItemsBatchDto } from '../dto/document.dto';

@Injectable()
export class AddDocumentItemsUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
  ) {}

  async execute(documentId: string, dto: AddDocumentItemsBatchDto): Promise<Document> {
    const document = await this.repo.findById(documentId);
    if (!document) throw new DocumentNotFoundError(documentId);

    for (const item of dto.items) {
      document.addItem(
        SourceReference.create({
          sourceType: item.sourceType,
          sourceRef: item.sourceRef,
          title: item.sourceTitle,
          url: item.sourceUrl ?? null,
          rawSnapshot: item.rawSnapshot ?? null,
        }),
      );
    }

    await this.repo.save(document);
    return document;
  }
}
