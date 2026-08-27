import { Module } from '@nestjs/common';
import { GithubGateway } from './infrastructure/github.gateway';
import { GITHUB_GATEWAY } from './application/ports/github-gateway.port';
import { TestGithubConnectionUseCase } from './application/use-cases/test-github-connection.use-case';
import { ListGithubReposUseCase } from './application/use-cases/list-github-repos.use-case';
import { ListGithubPullRequestsUseCase } from './application/use-cases/list-github-pull-requests.use-case';
import { GetGithubPullRequestUseCase } from './application/use-cases/get-github-pull-request.use-case';
import { GithubController } from './presentation/github.controller';

@Module({
  controllers: [GithubController],
  providers: [
    { provide: GITHUB_GATEWAY, useClass: GithubGateway },
    TestGithubConnectionUseCase,
    ListGithubReposUseCase,
    ListGithubPullRequestsUseCase,
    GetGithubPullRequestUseCase,
  ],
})
export class GithubModule {}
