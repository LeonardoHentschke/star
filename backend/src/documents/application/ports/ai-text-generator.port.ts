import { StarContent } from '../../domain/value-objects/star-content.vo';
import { SourceReference } from '../../domain/value-objects/source-reference.vo';

/**
 * Porta (interface): geração de texto STAR e resumo executivo via IA.
 * Hoje implementada pelo módulo `ai` usando a API do Gemini, mas o
 * domínio/aplicação não sabem disso — só conhecem este contrato.
 */
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
