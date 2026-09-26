export type JiraStatusCategory = 'new' | 'indeterminate' | 'done';

export interface JiraTaskDto {
  id: string;
  key: string;
  summary: string;
  description: string | null;
  status: string;
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

export interface JiraTaskQueryDto {
  periodStart: string;
  periodEnd: string;
  status?: string[];
  priority?: string[];
  issueType?: string[];
}

export interface JiraFilterOptionDto {
  id: string;
  name: string;
}

export interface JiraTaskFiltersDto {
  statuses: JiraFilterOptionDto[];
  priorities: JiraFilterOptionDto[];
  issueTypes: JiraFilterOptionDto[];
}

export interface JiraGatewayPort {
  testConnection(): Promise<ConnectionStatus>;
  findMyTasks(query: JiraTaskQueryDto): Promise<JiraTaskDto[]>;
  listTaskFilters(): Promise<JiraTaskFiltersDto>;
  findLinkedPullRequestUrls(issueId: string): Promise<JiraLinkedPullRequestDto[]>;
}

export const JIRA_GATEWAY = Symbol('JIRA_GATEWAY');
