import { Inject, Injectable } from '@nestjs/common';
import { JIRA_GATEWAY, JiraGatewayPort, JiraTaskFiltersDto } from '../ports/jira-gateway.port';

@Injectable()
export class ListJiraTaskFiltersUseCase {
  constructor(@Inject(JIRA_GATEWAY) private readonly gateway: JiraGatewayPort) {}

  execute(): Promise<JiraTaskFiltersDto> {
    return this.gateway.listTaskFilters();
  }
}
