import { Inject, Injectable } from '@nestjs/common';
import { GITHUB_GATEWAY, GithubGatewayPort, GithubPullRequestDto } from '../ports/github-gateway.port';

@Injectable()
export class GetGithubPullRequestUseCase {
  constructor(@Inject(GITHUB_GATEWAY) private readonly gateway: GithubGatewayPort) {}

  execute(url: string): Promise<GithubPullRequestDto> {
    return this.gateway.getPullRequestByUrl(url);
  }
}
