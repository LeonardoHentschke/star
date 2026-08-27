import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  ConnectionStatus,
  GithubGatewayPort,
  GithubPullRequestDto,
  GithubRepoDto,
} from '../application/ports/github-gateway.port';

@Injectable()
export class GithubGateway implements GithubGatewayPort {
  private client: AxiosInstance;
  private username: string | null = null;

  constructor(private config: ConfigService) {
    const token = this.config.get<string>('GITHUB_TOKEN', '');
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    });
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const { data } = await this.client.get('/user');
      this.username = data.login;
      return { ok: true, message: `Conectado como ${data.login}` };
    } catch (err) {
      return { ok: false, message: this.describeError(err) };
    }
  }

  async listRepos(): Promise<GithubRepoDto[]> {
    try {
      const { data } = await this.client.get('/user/repos', {
        params: { per_page: 100, sort: 'updated', affiliation: 'owner,collaborator,organization_member' },
      });
      return data.map((repo: any) => ({
        fullName: repo.full_name,
        private: repo.private,
        url: repo.html_url,
      }));
    } catch (err) {
      throw new InternalServerErrorException(`Falha ao listar repositórios do GitHub: ${this.describeError(err)}`);
    }
  }

  async findMyPullRequests(
    repoFullName: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<GithubPullRequestDto[]> {
    if (!this.username) await this.testConnection();

    const query = `repo:${repoFullName} is:pr author:${this.username} created:${periodStart}..${periodEnd}`;

    try {
      const { data } = await this.client.get('/search/issues', { params: { q: query, per_page: 100 } });

      // A Search API não retorna additions/deletions/changed_files (só o
      // endpoint de detalhe de uma PR específica retorna) — exigiria uma
      // chamada extra por PR, fora de escopo aqui pois este método não é
      // usado no fluxo de criação de item.
      return data.items.map((pr: any) => ({
        number: pr.number,
        repo: repoFullName,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        merged: !!pr.pull_request?.merged_at,
        url: pr.html_url,
        createdAt: pr.created_at,
        mergedAt: pr.pull_request?.merged_at ?? null,
        additions: 0,
        deletions: 0,
        changedFiles: 0,
      }));
    } catch (err) {
      throw new InternalServerErrorException(
        `Falha ao buscar Pull Requests em ${repoFullName}: ${this.describeError(err)}`,
      );
    }
  }

  async getPullRequestByUrl(url: string): Promise<GithubPullRequestDto> {
    const match = /github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/.exec(url);
    if (!match) throw new BadRequestException(`URL de Pull Request inválida: ${url}`);
    const [, repo, numberStr] = match;

    try {
      const { data: pr } = await this.client.get(`/repos/${repo}/pulls/${numberStr}`);
      return {
        number: pr.number,
        repo,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        merged: !!pr.merged_at,
        url: pr.html_url,
        createdAt: pr.created_at,
        mergedAt: pr.merged_at ?? null,
        additions: pr.additions ?? 0,
        deletions: pr.deletions ?? 0,
        changedFiles: pr.changed_files ?? 0,
      };
    } catch (err) {
      throw new InternalServerErrorException(`Falha ao buscar Pull Request ${repo}#${numberStr}: ${this.describeError(err)}`);
    }
  }

  private describeError(err: unknown): string {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 401) return 'Token inválido.';
      if (err.response?.status === 403) return 'Rate limit atingido ou permissão insuficiente.';
      return err.message;
    }
    return 'Erro desconhecido.';
  }
}
