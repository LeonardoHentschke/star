import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { z } from 'zod';
import { AiTextGeneratorPort, ConnectionStatus } from '../../documents/application/ports/ai-text-generator.port';
import { StarContent } from '../../documents/domain/value-objects/star-content.vo';
import { SourceReference } from '../../documents/domain/value-objects/source-reference.vo';

const StarResultSchema = z.object({
  situation: z.string(),
  task: z.string(),
  action: z.string(),
  result: z.string(),
});

const RankingResultSchema = z.array(z.string());

/**
 * Implementação concreta da porta AiTextGeneratorPort usando a API do
 * Gemini. Se um dia trocarmos de provedor de IA, só esta classe muda —
 * domínio e use cases continuam intocados.
 */
@Injectable()
export class GeminiAiGenerator implements AiTextGeneratorPort {
  private apiKey: string;
  private model: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY', '');
    this.model = this.config.get<string>('GEMINI_MODEL', 'gemini-2.0-flash');
  }

  // RF02 — usado pela tela de Conexões
  async testConnection(): Promise<ConnectionStatus> {
    try {
      const { data } = await axios.get(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}`,
        { params: { key: this.apiKey } },
      );
      return { ok: true, message: `Conectado ao modelo ${data.displayName ?? this.model}` };
    } catch (err) {
      return { ok: false, message: this.describeConnectionError(err) };
    }
  }

  // RF08
  async generateStarForItem(source: SourceReference): Promise<StarContent> {
    const prompt = `
Você é um assistente que ajuda profissionais de tecnologia a documentar suas conquistas
para reuniões de avaliação de desempenho, usando o método STAR (Situação, Tarefa, Ação, Resultado).

Com base na informação abaixo (origem: ${source.sourceType === 'jira' ? 'tarefa do Jira' : 'Pull Request do GitHub'}),
escreva um case STAR claro, específico e em primeira pessoa, evitando respostas vagas.
Se a informação não permitir inferir um "Resultado" com confiança, escreva um resultado
plausível de forma cautelosa e sinalize que precisa ser revisado pelo usuário.

Título: ${source.title}
Descrição: ${source.description ?? '(sem descrição disponível)'}

Responda APENAS em JSON, no formato:
{"situation": "...", "task": "...", "action": "...", "result": "..."}
`.trim();

    const raw = await this.callGemini(prompt);
    const parsed = this.parseJsonResponse(raw);
    return StarContent.create(parsed);
  }

  // RF12
  async generateExecutiveSummary(items: { title: string; star: StarContent }[]): Promise<string> {
    const itemsText = items
      .map(
        (it, i) =>
          `${i + 1}. ${it.title}\n   Situação: ${it.star.situation}\n   Ação: ${it.star.action}\n   Resultado: ${it.star.result}`,
      )
      .join('\n\n');

    const prompt = `
Você vai escrever um resumo executivo (um parágrafo, texto corrido, em primeira pessoa) para abrir
um documento de avaliação de desempenho. O resumo deve amarrar os itens abaixo, destacando o impacto
geral, sem repetir cada item em detalhe (o detalhe já vem depois no documento).

Itens do período:
${itemsText}

Responda apenas com o texto do resumo, sem JSON, sem markdown, sem aspas ao redor.
`.trim();

    return this.callGemini(prompt);
  }

  // RF12 — usado para listar as tarefas em ordem de impacto no documento gerado
  async rankItemsByImpact(items: { id: string; title: string; result: string }[]): Promise<string[]> {
    const itemsText = items
      .map((it, i) => `${i + 1}. id: "${it.id}" | Título: ${it.title}\n   Resultado: ${it.result}`)
      .join('\n\n');

    const prompt = `
Você vai ordenar as tarefas abaixo da mais impactante para a menos impactante, considerando o
resultado alcançado em cada uma (abrangência, complexidade e relevância técnica/de negócio).

Tarefas:
${itemsText}

Responda APENAS em JSON, com um array dos ids das tarefas ordenado do mais para o menos impactante,
no formato: ["id-mais-impactante", "id-seguinte", ...]. Inclua todos os ids exatamente como foram dados.
`.trim();

    const raw = await this.callGemini(prompt);
    return this.parseRankingResponse(raw);
  }

  private async callGemini(prompt: string): Promise<string> {
    try {
      const { data } = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        { contents: [{ parts: [{ text: prompt }] }] },
        { params: { key: this.apiKey } },
      );

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Resposta vazia do Gemini.');
      return text;
    } catch (err) {
      throw new InternalServerErrorException(
        `Falha ao chamar a API do Gemini: ${axios.isAxiosError(err) ? err.message : 'erro desconhecido'}`,
      );
    }
  }

  private describeConnectionError(err: unknown): string {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 400 || err.response?.status === 403) return 'Chave de API inválida.';
      if (err.response?.status === 404) return `Modelo "${this.model}" não encontrado ou indisponível.`;
      return err.message;
    }
    return 'Erro desconhecido.';
  }

  private parseJsonResponse(raw: string) {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new InternalServerErrorException('O Gemini retornou um formato inesperado (não era JSON válido).');
    }
    const result = StarResultSchema.safeParse(parsed);
    if (!result.success) {
      throw new InternalServerErrorException('O Gemini retornou um JSON que não bate com o formato STAR esperado.');
    }
    return result.data;
  }

  private parseRankingResponse(raw: string): string[] {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new InternalServerErrorException('O Gemini retornou um formato inesperado (não era JSON válido).');
    }
    const result = RankingResultSchema.safeParse(parsed);
    if (!result.success) {
      throw new InternalServerErrorException('O Gemini retornou um JSON que não bate com o formato de ranking esperado.');
    }
    return result.data;
  }
}
