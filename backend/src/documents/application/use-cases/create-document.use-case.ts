import { Inject, Injectable } from '@nestjs/common';
import { Document } from '../../domain/document.entity';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { CreateDocumentDto } from '../dto/document.dto';

@Injectable()
export class CreateDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
  ) {}

  async execute(dto: CreateDocumentDto): Promise<Document> {
    const document = Document.createNew(dto.title, dto.periodStart, dto.periodEnd);
    await this.repo.save(document);
    return document;
  }
}
