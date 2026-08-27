import { Module } from '@nestjs/common';
import { JiraGateway } from './infrastructure/jira.gateway';
import { JIRA_GATEWAY } from './application/ports/jira-gateway.port';
import { TestJiraConnectionUseCase } from './application/use-cases/test-jira-connection.use-case';
import { ListJiraTasksUseCase } from './application/use-cases/list-jira-tasks.use-case';
import { ListJiraLinkedPullRequestsUseCase } from './application/use-cases/list-jira-linked-pull-requests.use-case';
import { JiraController } from './presentation/jira.controller';

@Module({
  controllers: [JiraController],
  providers: [
    { provide: JIRA_GATEWAY, useClass: JiraGateway },
    TestJiraConnectionUseCase,
    ListJiraTasksUseCase,
    ListJiraLinkedPullRequestsUseCase,
  ],
  exports: [JIRA_GATEWAY],
})
export class JiraModule {}
