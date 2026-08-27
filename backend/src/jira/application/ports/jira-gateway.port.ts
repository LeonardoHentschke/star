export type JiraStatusCategory = 'new' | 'indeterminate' | 'done';

export interface JiraTaskDto {
  id: string;
  key: string;
  summary: string;
  description: string | null;
  status: string;
  // Categoria do status ('new'/'indeterminate'/'done'), independente do
  // texto exibido — que é customizável por workflow e idioma (ex: no
  // Jira em português, o status "concluído" ainda cai na categoria
  // "done"). É essa categoria, não o texto, que define "tarefa feita".
  statusCategory: JiraStatusCategory;
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
