import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentItem } from '../../domain/document-item.entity';
import {
  DocumentJobAlreadyRunningError,
  DocumentJobNotResumableError,
  DocumentNotFoundError,
} from '../../domain/errors/document-domain.errors';
import { SourceReference } from '../../domain/value-objects/source-reference.vo';
import {
  GITHUB_GATEWAY,
  GithubGatewayPort,
  GithubPullRequestDto,
} from '../../../github/application/ports/github-gateway.port';
import { JIRA_GATEWAY, JiraGatewayPort } from '../../../jira/application/ports/jira-gateway.port';
import { AddDocumentItemDto, AddDocumentItemsBatchDto } from '../dto/document.dto';

interface PullRequestSnapshot {
  number: number;
  repo: string;
  title: string;
  url: string;
  state: string;
  merged: boolean;
  additions: number;
  deletions: number;
  changedFiles: number;
  createdAt: string;
  mergedAt: string | null;
}

interface AddItemsJobPayload {
  items: AddDocumentItemDto[];
}

@Injectable()
export class AddDocumentItemsUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
    @Inject(GITHUB_GATEWAY) private readonly githubGateway: GithubGatewayPort,
    @Inject(JIRA_GATEWAY) private readonly jiraGateway: JiraGatewayPort,
  ) {}

  // Valida e dispara o processamento em background — não espera terminar.
  // Itens vindos de centenas de tarefas do Jira levam minutos (cada um busca
  // as PRs vinculadas no Jira + detalhes no GitHub), então isso não pode
  // bloquear a requisição HTTP.
  async start(documentId: string, dto: AddDocumentItemsBatchDto): Promise<void> {
    const document = await this.repo.findById(documentId);
    if (!document) throw new DocumentNotFoundError(documentId);
    if (document.jobStatus === 'processing') throw new DocumentJobAlreadyRunningError(documentId);

    await this.repo.updateJobState(documentId, {
      jobStatus: 'processing',
      jobType: 'add_items',
      jobError: null,
      jobProgressDone: 0,
      jobProgressTotal: dto.items.length,
      jobPayload: { items: dto.items } satisfies AddItemsJobPayload,
    });

    this.process(documentId).catch(() => {
      // process() já trata os próprios erros gravando jobStatus='failed';
      // este catch só evita um unhandled rejection.
    });
  }

  // Retoma um job que falhou no meio do caminho — continua só os itens que
  // ainda não foram adicionados (o payload salvo em `start()` guarda a
  // seleção original completa; o que já está em `document.items` nunca é
  // reprocessado). Não recebe corpo: tudo que precisa já está persistido.
  async resume(documentId: string): Promise<void> {
    const document = await this.repo.findById(documentId);
    if (!document) throw new DocumentNotFoundError(documentId);
    if (document.jobStatus === 'processing') throw new DocumentJobAlreadyRunningError(documentId);
    if (document.jobType !== 'add_items' || !document.jobPayload) {
      throw new DocumentJobNotResumableError(documentId);
    }

    await this.repo.updateJobState(documentId, { jobStatus: 'processing', jobError: null });

    this.process(documentId).catch(() => {});
  }

  private async process(documentId: string): Promise<void> {
    try {
      const document = await this.repo.findById(documentId);
      if (!document) return;

      const { items } = document.jobPayload as unknown as AddItemsJobPayload;
      const alreadyAdded = new Set(document.items.map((item) => `${item.source.sourceType}:${item.source.sourceRef}`));
      const pending = items.filter((item) => !alreadyAdded.has(`${item.sourceType}:${item.sourceRef}`));

      let done = document.items.length;
      let stillExists = true;
      for (const dtoItem of pending) {
        const source = await this.buildSourceReference(dtoItem);
        const item = DocumentItem.createNew(source, done);
        stillExists = await this.repo.saveItem(documentId, item);
        if (!stillExists) return;

        done++;
        await this.repo.updateJobState(documentId, { jobProgressDone: done });
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
        jobError: err instanceof Error ? err.message : 'Erro desconhecido ao adicionar itens.',
      });
    }
  }

  private async buildSourceReference(item: AddDocumentItemDto): Promise<SourceReference> {
    if (item.sourceType === 'github_pr') {
      const pr = item.sourceUrl ? await this.githubGateway.getPullRequestByUrl(item.sourceUrl) : null;
      const pullRequests = pr ? [this.toSnapshot(pr)] : [];

      return SourceReference.create({
        sourceType: item.sourceType,
        sourceRef: item.sourceRef,
        title: item.sourceTitle,
        url: item.sourceUrl ?? null,
        rawSnapshot: { description: item.description ?? pr?.body ?? null, pullRequests },
        merged: pr?.merged ?? null,
        additions: pr?.additions ?? 0,
        deletions: pr?.deletions ?? 0,
        changedFiles: pr?.changedFiles ?? 0,
      });
    }

    const linkedUrls = item.jiraIssueId
      ? (await this.jiraGateway.findLinkedPullRequestUrls(item.jiraIssueId)).map((pr) => pr.url)
      : [];
    const prs = await Promise.all(linkedUrls.map((url) => this.githubGateway.getPullRequestByUrl(url)));
    const pullRequests = prs.map((pr) => this.toSnapshot(pr));

    const description = [
      item.description,
      pullRequests.length > 0 &&
        'Pull Requests relacionados:\n' +
          pullRequests.map((pr) => `- ${pr.repo} #${pr.number} — ${pr.title}`).join('\n'),
    ]
      .filter(Boolean)
      .join('\n\n') || null;

    return SourceReference.create({
      sourceType: item.sourceType,
      sourceRef: item.sourceRef,
      title: item.sourceTitle,
      url: item.sourceUrl ?? null,
      rawSnapshot: { description, pullRequests },
      jiraStatus: item.jiraStatus ?? null,
      jiraDone: item.jiraStatusCategory === 'done',
      additions: pullRequests.reduce((sum, pr) => sum + pr.additions, 0),
      deletions: pullRequests.reduce((sum, pr) => sum + pr.deletions, 0),
      changedFiles: pullRequests.reduce((sum, pr) => sum + pr.changedFiles, 0),
    });
  }

  private toSnapshot(pr: GithubPullRequestDto): PullRequestSnapshot {
    return {
      number: pr.number,
      repo: pr.repo,
      title: pr.title,
      url: pr.url,
      state: pr.state,
      merged: pr.merged,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changedFiles,
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt,
    };
  }
}
