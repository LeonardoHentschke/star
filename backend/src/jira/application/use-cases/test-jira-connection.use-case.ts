import { Inject, Injectable } from '@nestjs/common';
import { ConnectionStatus, JIRA_GATEWAY, JiraGatewayPort } from '../ports/jira-gateway.port';

@Injectable()
export class TestJiraConnectionUseCase {
  constructor(@Inject(JIRA_GATEWAY) private readonly gateway: JiraGatewayPort) {}

  execute(): Promise<ConnectionStatus> {
    return this.gateway.testConnection();
  }
}
