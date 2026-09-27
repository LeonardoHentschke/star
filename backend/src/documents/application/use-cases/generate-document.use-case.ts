import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import {
  DocumentJobAlreadyRunningError,
  DocumentJobNotResumableError,
  DocumentNotFoundError,
} from '../../domain/errors/document-domain.errors';
import { AI_TEXT_GENERATOR, AiTextGeneratorPort } from '../ports/ai-text-generator.port';

interface GenerateJobPayload {
  regenerateSummary: boolean;
}

@Injectable()
export class GenerateDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
    @Inject(AI_TEXT_GENERATOR) private readonly aiGenerator: AiTextGeneratorPort,
  ) {}

  async start(documentId: string, regenerateSummary: boolean): Promise<void> {
    const document = await this.repo.findById(documentId);
    if (!document) throw new DocumentNotFoundError(documentId);
    if (document.jobStatus === 'processing') throw new DocumentJobAlreadyRunningError(documentId);

    await this.repo.updateJobState(documentId, {
      jobStatus: 'processing',
      jobType: 'generate',
      jobError: null,
      jobProgressDone: 0,
      jobProgressTotal: document.items.length,
      jobPayload: { regenerateSummary } satisfies GenerateJobPayload,
    });

    this.runFrom(documentId, true).catch(() => {
    });
  }

  async resume(documentId: string): Promise<void> {
    const document = await this.repo.findById(documentId);
    if (!document) throw new DocumentNotFoundError(documentId);
    if (document.jobStatus === 'processing') throw new DocumentJobAlreadyRunningError(documentId);
    if (document.jobType !== 'generate' || document.jobStatus !== 'failed') {
      throw new DocumentJobNotResumableError(documentId);
    }

    const regenerateSummary = document.jobPayload
      ? (document.jobPayload as unknown as GenerateJobPayload).regenerateSummary
      : true;

    await this.repo.updateJobState(documentId, {
      jobStatus: 'processing',
      jobError: null,
      jobPayload: { regenerateSummary } satisfies GenerateJobPayload,
    });

    this.runFrom(documentId, false).catch(() => {});
  }

  private async runFrom(documentId: string, resetAll: boolean): Promise<void> {
    try {
      const document = await this.repo.findById(documentId);
      if (!document) return;

      if (resetAll && document.items.some((item) => item.star.isComplete())) {
        document.resetAllStars();
        await this.repo.save(document);
      }

      const pending = document.items.filter((item) => !item.star.isComplete());
      let done = document.items.length - pending.length;
      let stillExists = true;
      for (const item of pending) {
        const star = await this.aiGenerator.generateStarForItem(item.source);
        const updatedItem = document.applyGeneratedStarToItem(item.id, star);
        stillExists = await this.repo.saveItem(documentId, updatedItem);
        if (!stillExists) return;

        done++;
        await this.repo.updateJobState(documentId, { jobProgressDone: done });
      }

      const { regenerateSummary } = document.jobPayload as unknown as GenerateJobPayload;
      if (regenerateSummary) {
        const completeItems = document.itemsWithCompleteStar();

        if (completeItems.length > 1) {
          try {
            const rankedIds = await this.aiGenerator.rankItemsByImpact(
              completeItems.map((item) => ({ id: item.id, title: item.source.title, result: item.star.result ?? '' })),
            );
            document.reorderItems(rankedIds);
          } catch {
          }
        }

        const orderedCompleteItems = document.itemsWithCompleteStar();
        if (orderedCompleteItems.length > 0) {
          const summary = await this.aiGenerator.generateExecutiveSummary(
            orderedCompleteItems.map((item) => ({ title: item.source.title, star: item.star })),
          );
          document.setExecutiveSummary(summary);
        }

        await this.repo.save(document);
      }

      await this.repo.updateJobState(documentId, {
        jobStatus: 'idle',
        jobProgressDone: null,
        jobProgressTotal: null,
        jobPayload: null,
      });
    } catch (err) {
      await this.repo.updateJobState(documentId, {
        jobStatus: 'failed',
        jobError: err instanceof Error ? err.message : 'Erro desconhecido ao gerar o documento.',
      });
    }
  }
}
