import { Controller, Get } from '@nestjs/common';
import { TestAiConnectionUseCase } from '../application/use-cases/test-ai-connection.use-case';

@Controller('ai')
export class AiController {
  constructor(private readonly testConnection: TestAiConnectionUseCase) {}

  // RF02 — usado pela tela de Conexões
  @Get('test-connection')
  testAiConnection() {
    return this.testConnection.execute();
  }
}
