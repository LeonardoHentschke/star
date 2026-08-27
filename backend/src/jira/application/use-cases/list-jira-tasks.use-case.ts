import { Inject, Injectable } from '@nestjs/common';
import { JIRA_GATEWAY, JiraGatewayPort, JiraTaskDto } from '../ports/jira-gateway.port';

@Injectable()
export class ListJiraTasksUseCase {
  constructor(@Inject(JIRA_GATEWAY) private readonly gateway: JiraGatewayPort) {}

  execute(periodStart: string, periodEnd: string): Promise<JiraTaskDto[]> {
    return this.gateway.findMyTasks(periodStart, periodEnd);
  }
}
