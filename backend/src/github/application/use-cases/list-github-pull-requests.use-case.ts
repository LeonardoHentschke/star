import { Inject, Injectable } from '@nestjs/common';
import { GITHUB_GATEWAY, GithubGatewayPort, GithubPullRequestDto } from '../ports/github-gateway.port';

@Injectable()
export class ListGithubPullRequestsUseCase {
  constructor(@Inject(GITHUB_GATEWAY) private readonly gateway: GithubGatewayPort) {}

  execute(repo: string, periodStart: string, periodEnd: string): Promise<GithubPullRequestDto[]> {
    return this.gateway.findMyPullRequests(repo, periodStart, periodEnd);
  }
}
