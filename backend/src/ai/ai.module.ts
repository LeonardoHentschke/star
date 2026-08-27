import { Module } from '@nestjs/common';
import { GeminiAiGenerator } from './infrastructure/gemini-ai-generator';
import { AI_TEXT_GENERATOR } from '../documents/application/ports/ai-text-generator.port';
import { TestAiConnectionUseCase } from './application/use-cases/test-ai-connection.use-case';
import { AiController } from './presentation/ai.controller';

@Module({
  controllers: [AiController],
  providers: [{ provide: AI_TEXT_GENERATOR, useClass: GeminiAiGenerator }, TestAiConnectionUseCase],
  exports: [AI_TEXT_GENERATOR],
})
export class AiModule {}
