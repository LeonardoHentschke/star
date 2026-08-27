import { Controller, Get, Query } from '@nestjs/common';
import { TestGithubConnectionUseCase } from '../application/use-cases/test-github-connection.use-case';
import { ListGithubReposUseCase } from '../application/use-cases/list-github-repos.use-case';
import { ListGithubPullRequestsUseCase } from '../application/use-cases/list-github-pull-requests.use-case';
import { GetGithubPullRequestUseCase } from '../application/use-cases/get-github-pull-request.use-case';

@Controller('github')
export class GithubController {
  constructor(
    private readonly testConnection: TestGithubConnectionUseCase,
    private readonly listRepos: ListGithubReposUseCase,
    private readonly listPullRequests: ListGithubPullRequestsUseCase,
    private readonly getPullRequest: GetGithubPullRequestUseCase,
  ) {}

  // RF02
  @Get('test-connection')
  testGithubConnection() {
    return this.testConnection.execute();
  }

  // RF03
  @Get('repos')
  findRepos() {
    return this.listRepos.execute();
  }

  // RF04
  @Get('pull-requests')
  findPullRequests(
    @Query('repo') repo: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.listPullRequests.execute(repo, periodStart, periodEnd);
  }

  // Usado na tela "Novo Documento" para buscar o título/corpo de um PR
  // já linkado a uma tarefa do Jira (fluxo tarefa → PRs vinculados).
  @Get('pull-requests/lookup')
  findPullRequestByUrl(@Query('url') url: string) {
    return this.getPullRequest.execute(url);
  }
}
