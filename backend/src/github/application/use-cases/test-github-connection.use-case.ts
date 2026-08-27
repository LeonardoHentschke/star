import { Inject, Injectable } from '@nestjs/common';
import { ConnectionStatus, GITHUB_GATEWAY, GithubGatewayPort } from '../ports/github-gateway.port';

@Injectable()
export class TestGithubConnectionUseCase {
  constructor(@Inject(GITHUB_GATEWAY) private readonly gateway: GithubGatewayPort) {}

  execute(): Promise<ConnectionStatus> {
    return this.gateway.testConnection();
  }
}
