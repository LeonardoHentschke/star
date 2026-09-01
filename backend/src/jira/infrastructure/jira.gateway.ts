import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  ConnectionStatus,
  JiraFilterOptionDto,
  JiraGatewayPort,
  JiraLinkedPullRequestDto,
  JiraStatusCategory,
  JiraTaskDto,
  JiraTaskFiltersDto,
  JiraTaskQueryDto,
} from '../application/ports/jira-gateway.port';

const VALID_STATUS_CATEGORIES: JiraStatusCategory[] = ['new', 'indeterminate', 'done'];

@Injectable()
export class JiraGateway implements JiraGatewayPort {
  private client: AxiosInstance;
  private domain: string;

  constructor(private config: ConfigService) {
    this.domain = this.config.get<string>('JIRA_DOMAIN', '');
    const email = this.config.get<string>('JIRA_EMAIL', '');
    const token = this.config.get<string>('JIRA_API_TOKEN', '');

    this.client = axios.create({
      baseURL: `https://${this.domain}/rest/api/3`,
      auth: { username: email, password: token },
      headers: { Accept: 'application/json' },
    });
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const { data } = await this.withDnsRetry(() => this.client.get('/myself'));
      return { ok: true, message: `Conectado como ${data.displayName}` };
    } catch (err) {
      return { ok: false, message: this.describeError(err) };
    }
  }

  async findMyTasks(query: JiraTaskQueryDto): Promise<JiraTaskDto[]> {
    // Inclui "assignee was" para não perder tarefas que o usuário trabalhou
    // mas que foram reatribuídas depois; e usa hora explícita no fim do
    // período porque o Jira trata data sem hora como "00:00", o que corta
    // fora quase o dia inteiro de periodEnd.
    let jql = `(assignee = currentUser() OR assignee was currentUser()) AND updated >= "${query.periodStart} 00:00" AND updated <= "${query.periodEnd} 23:59"`;
    const statusIds = this.jqlIdList(query.status);
    const priorityIds = this.jqlIdList(query.priority);
    const issueTypeIds = this.jqlIdList(query.issueType);
    if (statusIds) jql += ` AND status in ${statusIds}`;
    if (priorityIds) jql += ` AND priority in ${priorityIds}`;
    if (issueTypeIds) jql += ` AND issuetype in ${issueTypeIds}`;
    jql += ' ORDER BY updated DESC';

    try {
      const issues: any[] = [];
      let nextPageToken: string | undefined;

      do {
        const { data } = await this.withDnsRetry(() =>
          this.client.post('/search/jql', {
            jql,
            maxResults: 100,
            fields: ['summary', 'description', 'status', 'updated'],
            ...(nextPageToken ? { nextPageToken } : {}),
          }),
        );

        issues.push(...data.issues);
        nextPageToken = data.isLast ? undefined : data.nextPageToken;
      } while (nextPageToken);

      return issues.map((issue: any) => {
        const categoryKey = issue.fields.status?.statusCategory?.key;
        return {
          id: issue.id,
          key: issue.key,
          summary: issue.fields.summary,
          description: this.extractPlainText(issue.fields.description),
          status: issue.fields.status?.name ?? '',
          statusCategory: VALID_STATUS_CATEGORIES.includes(categoryKey) ? categoryKey : 'new',
          updated: issue.fields.updated,
          url: `https://${this.domain}/browse/${issue.key}`,
        };
      });
    } catch (err) {
      throw new InternalServerErrorException(`Falha ao buscar tarefas do Jira: ${this.describeError(err)}`);
    }
  }

  // Consulta os catálogos globais do Jira para popular os filtros
  // opcionais da busca de tarefas (status/prioridade/tipo). O filtro em si
  // usa o id (não o nome) porque issue.fields.status.name vem traduzido
  // conforme o idioma da conta, e o JQL "status = <nome>" só casa com o
  // nome original do workflow. Como o mesmo nome de status pode ter ids
  // diferentes em workflows diferentes, agrupamos por nome e juntamos os
  // ids com vírgula — o parser de query do controller já espera esse
  // formato para múltiplos valores, então um único item selecionado no
  // dropdown pode expandir para "in (id1, id2)" no JQL.
  async listTaskFilters(): Promise<JiraTaskFiltersDto> {
    try {
      const statusesRes = await this.withDnsRetry(() => this.client.get('/status'));
      const prioritiesRes = await this.withDnsRetry(() => this.client.get('/priority'));
      const issueTypesRes = await this.withDnsRetry(() => this.client.get('/issuetype'));

      const groupIdsByName = (items: any[]): JiraFilterOptionDto[] => {
        const idsByName = new Map<string, string[]>();
        for (const item of items) {
          const ids = idsByName.get(item.name) ?? [];
          ids.push(String(item.id));
          idsByName.set(item.name, ids);
        }
        return Array.from(idsByName.entries()).map(([name, ids]) => ({ id: ids.join(','), name }));
      };

      return {
        statuses: groupIdsByName(statusesRes.data),
        priorities: prioritiesRes.data.map((p: any) => ({ id: String(p.id), name: p.name })),
        issueTypes: issueTypesRes.data.map((t: any) => ({ id: String(t.id), name: t.name })),
      };
    } catch (err) {
      throw new InternalServerErrorException(`Falha ao buscar filtros do Jira: ${this.describeError(err)}`);
    }
  }

  // Usa a API dev-status (a mesma que alimenta o painel "Development" da
  // issue no Jira) para achar os PRs do GitHub já linkados pelo app
  // "GitHub for Jira" — não depende de heurística de texto.
  //
  // O valor de applicationType documentado publicamente ("GitHub") é da
  // integração DVCS antiga; o app atual "GitHub for Jira" (instalado via
  // OAuth/GitHub App) usa o identificador de instância
  // "oAuth-com.github.integration.production" — confirmado testando
  // contra /rest/dev-status/1.0/issue/summary, cujo byInstanceType
  // revela esse identificador.
  async findLinkedPullRequestUrls(issueId: string): Promise<JiraLinkedPullRequestDto[]> {
    try {
      const { data } = await this.withDnsRetry(() =>
        this.client.get(`https://${this.domain}/rest/dev-status/1.0/issue/detail`, {
          params: {
            issueId,
            applicationType: 'oAuth-com.github.integration.production',
            dataType: 'pullrequest',
          },
        }),
      );

      return (data.detail ?? []).flatMap((detail: any) =>
        (detail.pullRequests ?? []).map((pr: any) => ({ url: pr.url, status: pr.status })),
      );
    } catch (err) {
      throw new InternalServerErrorException(
        `Falha ao buscar Pull Requests vinculados no Jira: ${this.describeError(err)}`,
      );
    }
  }

  private extractPlainText(adf: any): string | null {
    if (!adf?.content) return null;
    const parts: string[] = [];
    const walk = (node: any) => {
      if (node.type === 'text' && node.text) parts.push(node.text);
      if (node.content) node.content.forEach(walk);
    };
    adf.content.forEach(walk);
    return parts.join(' ').trim() || null;
  }

  // Filtra por ID, não por nome: o nome do status vem traduzido conforme o
  // idioma da conta (issue.fields.status.name), mas o JQL "status = <nome>"
  // só casa com o nome original do workflow — só o ID é estável para JQL.
  private jqlIdList(ids?: string[]): string | null {
    const numericIds = (ids ?? []).filter((id) => /^\d+$/.test(id));
    return numericIds.length ? `(${numericIds.join(', ')})` : null;
  }

  // O DNS embutido do Docker às vezes falha de forma intermitente logo após
  // o processo subir (getaddrinfo EAI_AGAIN), mesmo em chamadas sequenciais
  // — observado repetidamente contra o domínio real do Jira neste ambiente.
  // Retenta algumas vezes com um pequeno backoff antes de desistir.
  private async withDnsRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxAttempts = 4;
    const transientCodes = new Set(['EAI_AGAIN', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT']);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const isTransient = axios.isAxiosError(err) && transientCodes.has(err.code ?? '');
        if (!isTransient || attempt === maxAttempts) throw err;
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
    throw new Error('unreachable');
  }

  private describeError(err: unknown): string {
    if (axios.isAxiosError(err)) {
      return err.response?.status === 401 || err.response?.status === 403
        ? 'Token inválido ou sem permissão.'
        : err.message;
    }
    return 'Erro desconhecido.';
  }
}
