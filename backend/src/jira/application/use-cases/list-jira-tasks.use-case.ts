import { Inject, Injectable } from '@nestjs/common';
import { JIRA_GATEWAY, JiraGatewayPort, JiraTaskDto, JiraTaskQueryDto } from '../ports/jira-gateway.port';

@Injectable()
export class ListJiraTasksUseCase {
  constructor(@Inject(JIRA_GATEWAY) private readonly gateway: JiraGatewayPort) {}

  execute(query: JiraTaskQueryDto): Promise<JiraTaskDto[]> {
    return this.gateway.findMyTasks(query);
  }
}
