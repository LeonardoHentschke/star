export interface GithubRepoDto {
  fullName: string;
  private: boolean;
  url: string;
}

export interface GithubPullRequestDto {
  number: number;
  repo: string;
  title: string;
  body: string | null;
  state: string;
  merged: boolean;
  url: string;
  createdAt: string;
  mergedAt: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface ConnectionStatus {
  ok: boolean;
  message: string;
}

/**
 * Porta (interface): acesso ao GitHub. Implementada em
 * infrastructure/github.gateway.ts usando a REST API do GitHub.
 */
export interface GithubGatewayPort {
  testConnection(): Promise<ConnectionStatus>;
  listRepos(): Promise<GithubRepoDto[]>;
  findMyPullRequests(
    repoFullName: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<GithubPullRequestDto[]>;
  getPullRequestByUrl(url: string): Promise<GithubPullRequestDto>;
}

export const GITHUB_GATEWAY = Symbol('GITHUB_GATEWAY');
