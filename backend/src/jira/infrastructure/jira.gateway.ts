import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  ConnectionStatus,
  JiraGatewayPort,
  JiraLinkedPullRequestDto,
  JiraTaskDto,
} from '../application/ports/jira-gateway.port';

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
      const { data } = await this.client.get('/myself');
      return { ok: true, message: `Conectado como ${data.displayName}` };
    } catch (err) {
      return { ok: false, message: this.describeError(err) };
    }
  }

  async findMyTasks(periodStart: string, periodEnd: string): Promise<JiraTaskDto[]> {
    const jql = `assignee = currentUser() AND updated >= "${periodStart}" AND updated <= "${periodEnd}" ORDER BY updated DESC`;

    try {
      const { data } = await this.client.post('/search/jql', {
        jql,
        maxResults: 100,
        fields: ['summary', 'description', 'status', 'updated'],
      });

      return data.issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: this.extractPlainText(issue.fields.description),
        status: issue.fields.status?.name ?? '',
        updated: issue.fields.updated,
        url: `https://${this.domain}/browse/${issue.key}`,
      }));
    } catch (err) {
      throw new InternalServerErrorException(`Falha ao buscar tarefas do Jira: ${this.describeError(err)}`);
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
      const { data } = await this.client.get(`https://${this.domain}/rest/dev-status/1.0/issue/detail`, {
        params: {
          issueId,
          applicationType: 'oAuth-com.github.integration.production',
          dataType: 'pullrequest',
        },
      });

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

  private describeError(err: unknown): string {
    if (axios.isAxiosError(err)) {
      return err.response?.status === 401 || err.response?.status === 403
        ? 'Token inválido ou sem permissão.'
        : err.message;
    }
    return 'Erro desconhecido.';
  }
}
