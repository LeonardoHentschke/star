import { Inject, Injectable } from '@nestjs/common';
import { Document } from '../../domain/document.entity';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentNotFoundError } from '../../domain/errors/document-domain.errors';

@Injectable()
export class SetFavoriteDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
  ) {}

  async execute(id: string, favorite: boolean): Promise<Document> {
    const document = await this.repo.findById(id);
    if (!document) throw new DocumentNotFoundError(id);

    if (favorite) await this.repo.clearFavorite();
    document.setFavorite(favorite);

    await this.repo.save(document);
    return document;
  }
}
