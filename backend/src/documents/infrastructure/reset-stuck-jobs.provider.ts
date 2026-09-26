import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../domain/document.repository';

@Injectable()
export class ResetStuckJobsProvider implements OnApplicationBootstrap {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.repo.failAllProcessingJobs('Processamento interrompido (servidor reiniciado). Tente novamente.');
  }
}
