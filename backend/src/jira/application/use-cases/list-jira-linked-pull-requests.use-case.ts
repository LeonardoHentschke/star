import { Inject, Injectable } from '@nestjs/common';
import {
  JIRA_GATEWAY,
  JiraGatewayPort,
  JiraLinkedPullRequestDto,
} from '../ports/jira-gateway.port';

@Injectable()
export class ListJiraLinkedPullRequestsUseCase {
  constructor(@Inject(JIRA_GATEWAY) private readonly gateway: JiraGatewayPort) {}

  execute(issueId: string): Promise<JiraLinkedPullRequestDto[]> {
    return this.gateway.findLinkedPullRequestUrls(issueId);
  }
}
