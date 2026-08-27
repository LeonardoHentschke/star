import { Inject, Injectable } from '@nestjs/common';
import { Document } from '../../domain/document.entity';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentNotFoundError } from '../../domain/errors/document-domain.errors';
import { AI_TEXT_GENERATOR, AiTextGeneratorPort } from '../ports/ai-text-generator.port';

@Injectable()
export class GenerateDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
    @Inject(AI_TEXT_GENERATOR) private readonly aiGenerator: AiTextGeneratorPort,
  ) {}

  async execute(documentId: string, regenerateSummary: boolean): Promise<Document> {
    const document = await this.repo.findById(documentId);
    if (!document) throw new DocumentNotFoundError(documentId);

    // RF08 — gera o STAR de cada item selecionado
    for (const item of document.items) {
      const star = await this.aiGenerator.generateStarForItem(item.source);
      document.applyGeneratedStarToItem(item.id, star);
    }

    // RF12 — resumo executivo, considerando só itens com STAR completo
    // (regra de negócio definida no agregado, não aqui)
    if (regenerateSummary) {
      const completeItems = document.itemsWithCompleteStar();

      // Lista as tarefas em ordem de impacto (mais impactantes primeiro) antes
      // de montar o resumo. É um refinamento, não uma etapa crítica — se a IA
      // falhar ou responder algo inesperado, mantém a ordem atual do documento.
      if (completeItems.length > 1) {
        try {
          const rankedIds = await this.aiGenerator.rankItemsByImpact(
            completeItems.map((item) => ({ id: item.id, title: item.source.title, result: item.star.result ?? '' })),
          );
          document.reorderItems(rankedIds);
        } catch {
          // mantém a ordem atual
        }
      }

      const orderedCompleteItems = document.itemsWithCompleteStar();
      if (orderedCompleteItems.length > 0) {
        const summary = await this.aiGenerator.generateExecutiveSummary(
          orderedCompleteItems.map((item) => ({ title: item.source.title, star: item.star })),
        );
        document.setExecutiveSummary(summary);
      }
    }

    await this.repo.save(document);
    return document;
  }
}
