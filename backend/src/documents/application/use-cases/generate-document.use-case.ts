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

  // Dispara a geração em background — não espera terminar. Com centenas de
  // itens, uma chamada de IA por item sequencial demoraria minutos dentro de
  // uma única requisição HTTP.
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

    // "Gerar/Regerar com IA" sempre reprocessa tudo do zero — limpa o STAR
    // atual antes de rodar, assim uma falha no meio pode ser retomada como
    // qualquer outra (o critério de "pendente" é sempre "STAR incompleto").
    this.runFrom(documentId, true).catch(() => {
      // process() já trata os próprios erros gravando jobStatus='failed';
      // este catch só evita um unhandled rejection.
    });
  }

  // Retoma um job que falhou no meio do caminho — continua só os itens cujo
  // STAR ainda está incompleto (e, se for o caso, refaz só a etapa de
  // ranking/resumo executivo). Não recebe corpo: a intenção original
  // (`regenerateSummary`) já foi salva pelo `start()` — jobs que falharam
  // antes dessa gravação existir (payload nulo) assumem `true`, o mesmo
  // padrão usado no schema de `generate`.
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

      // RF08 — gera o STAR de cada item ainda pendente
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

      // RF12 — resumo executivo, considerando só itens com STAR completo
      // (regra de negócio definida no agregado, não aqui)
      const { regenerateSummary } = document.jobPayload as unknown as GenerateJobPayload;
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

        // Cobre a reordenação de todos os itens + o resumo executivo — não dá
        // pra persistir isso item a item como o laço acima. O STAR de cada
        // item já está salvo, então se essa etapa falhar sozinha, o resume()
        // não terá itens pendentes e vai direto pra ela de novo.
        await this.repo.save(document);
      }

      // Mantém `jobType` (não zera): o frontend só observa a transição
      // final via polling, e precisa saber o que terminou ("adicionar
      // itens" vs "gerar com IA") pra montar a mensagem do toast.
      await this.repo.updateJobState(documentId, {
        jobStatus: 'idle',
        jobProgressDone: null,
        jobProgressTotal: null,
        jobPayload: null,
      });
    } catch (err) {
      // Não mexe em jobPayload/jobProgress — é isso que permite retomar
      // depois via resume(), continuando só os itens que faltam.
      await this.repo.updateJobState(documentId, {
        jobStatus: 'failed',
        jobError: err instanceof Error ? err.message : 'Erro desconhecido ao gerar o documento.',
      });
    }
  }
}
