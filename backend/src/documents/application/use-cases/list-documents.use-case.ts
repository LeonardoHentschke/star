import { Inject, Injectable } from '@nestjs/common';
import { Document } from '../../domain/document.entity';
import { DOCUMENT_REPOSITORY, DocumentRepository, DocumentStats } from '../../domain/document.repository';

const EMPTY_STATS: DocumentStats = { itemCount: 0, generatedCount: 0, pullRequestCount: 0 };

@Injectable()
export class ListDocumentsUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
  ) {}

  async execute(): Promise<{ document: Document; stats: DocumentStats }[]> {
    const [documents, stats] = await Promise.all([this.repo.findAll(), this.repo.findAllStats()]);
    return documents.map((document) => ({ document, stats: stats.get(document.id) ?? EMPTY_STATS }));
  }
}
