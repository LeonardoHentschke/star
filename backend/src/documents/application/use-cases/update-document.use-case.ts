import { Inject, Injectable } from '@nestjs/common';
import { Document } from '../../domain/document.entity';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentNotFoundError } from '../../domain/errors/document-domain.errors';
import { UpdateDocumentDto } from '../dto/document.dto';

@Injectable()
export class UpdateDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
  ) {}

  async execute(id: string, dto: UpdateDocumentDto): Promise<Document> {
    const document = await this.repo.findById(id);
    if (!document) throw new DocumentNotFoundError(id);

    if (dto.title !== undefined) document.rename(dto.title);
    if (dto.executiveSummary !== undefined) document.setExecutiveSummary(dto.executiveSummary);

    await this.repo.save(document);
    return document;
  }
}
