import { Inject, Injectable } from '@nestjs/common';
import { AI_TEXT_GENERATOR, AiTextGeneratorPort, ConnectionStatus } from '../../../documents/application/ports/ai-text-generator.port';

@Injectable()
export class TestAiConnectionUseCase {
  constructor(@Inject(AI_TEXT_GENERATOR) private readonly generator: AiTextGeneratorPort) {}

  execute(): Promise<ConnectionStatus> {
    return this.generator.testConnection();
  }
}
