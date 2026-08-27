import { Controller, Get, Param, Query } from '@nestjs/common';
import { TestJiraConnectionUseCase } from '../application/use-cases/test-jira-connection.use-case';
import { ListJiraTasksUseCase } from '../application/use-cases/list-jira-tasks.use-case';
import { ListJiraLinkedPullRequestsUseCase } from '../application/use-cases/list-jira-linked-pull-requests.use-case';

@Controller('jira')
export class JiraController {
  constructor(
    private readonly testConnection: TestJiraConnectionUseCase,
    private readonly listTasks: ListJiraTasksUseCase,
    private readonly listLinkedPullRequests: ListJiraLinkedPullRequestsUseCase,
  ) {}

  // RF02 — usado pela tela de Conexões
  @Get('test-connection')
  testJiraConnection() {
    return this.testConnection.execute();
  }

  // RF05 — usado na tela "Novo Documento"
  @Get('tasks')
  findMyTasks(@Query('periodStart') periodStart: string, @Query('periodEnd') periodEnd: string) {
    return this.listTasks.execute(periodStart, periodEnd);
  }

  // Usado na tela "Novo Documento" para achar os PRs já linkados a uma
  // tarefa (app "GitHub for Jira") ao invés do usuário selecionar repos.
  @Get('tasks/:issueId/pull-requests')
  findLinkedPullRequests(@Param('issueId') issueId: string) {
    return this.listLinkedPullRequests.execute(issueId);
  }
}
