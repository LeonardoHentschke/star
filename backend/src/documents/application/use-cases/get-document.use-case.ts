import { Inject, Injectable } from '@nestjs/common';
import { Document } from '../../domain/document.entity';
import { DOCUMENT_REPOSITORY, DocumentItemsPage, DocumentRepository } from '../../domain/document.repository';
import { DocumentNotFoundError } from '../../domain/errors/document-domain.errors';

@Injectable()
export class GetDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
  ) {}

  async execute(id: string): Promise<Document> {
    const document = await this.repo.findById(id);
    if (!document) throw new DocumentNotFoundError(id);
    return document;
  }

  async executePage(id: string, page: number, pageSize: number): Promise<DocumentItemsPage> {
    const result = await this.repo.findByIdWithItemsPage(id, (page - 1) * pageSize, pageSize);
    if (!result) throw new DocumentNotFoundError(id);
    return result;
  }
}
