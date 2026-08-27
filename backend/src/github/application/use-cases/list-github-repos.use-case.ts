import { Inject, Injectable } from '@nestjs/common';
import { GITHUB_GATEWAY, GithubGatewayPort, GithubRepoDto } from '../ports/github-gateway.port';

@Injectable()
export class ListGithubReposUseCase {
  constructor(@Inject(GITHUB_GATEWAY) private readonly gateway: GithubGatewayPort) {}

  execute(): Promise<GithubRepoDto[]> {
    return this.gateway.listRepos();
  }
}
