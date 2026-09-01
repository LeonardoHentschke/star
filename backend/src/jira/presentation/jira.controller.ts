import { Controller, Get, Param, Query } from '@nestjs/common';
import { TestJiraConnectionUseCase } from '../application/use-cases/test-jira-connection.use-case';
import { ListJiraTasksUseCase } from '../application/use-cases/list-jira-tasks.use-case';
import { ListJiraTaskFiltersUseCase } from '../application/use-cases/list-jira-task-filters.use-case';
import { ListJiraLinkedPullRequestsUseCase } from '../application/use-cases/list-jira-linked-pull-requests.use-case';

// Filtros multi-valor chegam como uma única query string separada por
// vírgula (ex: "status=A,B") em vez de chave repetida, pra não depender
// de como cada client serializa arrays em query params.
function parseList(value?: string): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

@Controller('jira')
export class JiraController {
  constructor(
    private readonly testConnection: TestJiraConnectionUseCase,
    private readonly listTasks: ListJiraTasksUseCase,
    private readonly listTaskFilters: ListJiraTaskFiltersUseCase,
    private readonly listLinkedPullRequests: ListJiraLinkedPullRequestsUseCase,
  ) {}

  // RF02 — usado pela tela de Conexões
  @Get('test-connection')
  testJiraConnection() {
    return this.testConnection.execute();
  }

  // RF05 — usado na tela "Novo Documento"
  @Get('tasks')
  findMyTasks(
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('issueType') issueType?: string,
  ) {
    return this.listTasks.execute({
      periodStart,
      periodEnd,
      status: parseList(status),
      priority: parseList(priority),
      issueType: parseList(issueType),
    });
  }

  // Popula os dropdowns de filtro (status/prioridade/tipo) na tela "Novo Documento"
  @Get('task-filters')
  findTaskFilters() {
    return this.listTaskFilters.execute();
  }

  // Usado na tela "Novo Documento" para achar os PRs já linkados a uma
  // tarefa (app "GitHub for Jira") ao invés do usuário selecionar repos.
  @Get('tasks/:issueId/pull-requests')
  findLinkedPullRequests(@Param('issueId') issueId: string) {
    return this.listLinkedPullRequests.execute(issueId);
  }
}
