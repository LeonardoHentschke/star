import { StarContent } from '../../domain/value-objects/star-content.vo';
import { SourceReference } from '../../domain/value-objects/source-reference.vo';

export interface ConnectionStatus {
  ok: boolean;
  message: string;
}

export interface AiTextGeneratorPort {
  testConnection(): Promise<ConnectionStatus>;

  generateStarForItem(source: SourceReference): Promise<StarContent>;

  generateExecutiveSummary(
    items: { title: string; star: StarContent }[],
  ): Promise<string>;

  rankItemsByImpact(
    items: { id: string; title: string; result: string }[],
  ): Promise<string[]>;
}

export const AI_TEXT_GENERATOR = Symbol('AI_TEXT_GENERATOR');
