export interface JiraTaskDto {
  id: string;
  key: string;
  summary: string;
  description: string | null;
  status: string;
  updated: string;
  url: string;
}

export interface JiraLinkedPullRequestDto {
  url: string;
  status: string;
}

export interface ConnectionStatus {
  ok: boolean;
  message: string;
}

/**
 * Porta (interface): acesso ao Jira Cloud. Implementada em
 * infrastructure/jira.gateway.ts usando a API REST do Jira.
 */
export interface JiraGatewayPort {
  testConnection(): Promise<ConnectionStatus>;
  findMyTasks(periodStart: string, periodEnd: string): Promise<JiraTaskDto[]>;
  findLinkedPullRequestUrls(issueId: string): Promise<JiraLinkedPullRequestDto[]>;
}

export const JIRA_GATEWAY = Symbol('JIRA_GATEWAY');
