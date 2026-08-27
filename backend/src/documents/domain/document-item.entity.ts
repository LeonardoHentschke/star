import { randomUUID } from 'crypto';
import { StarContent } from './value-objects/star-content.vo';
import { SourceReference } from './value-objects/source-reference.vo';

/**
 * Entidade de domínio: um item do documento (uma tarefa do Jira ou um
 * Pull Request do GitHub), com seu conteúdo STAR gerado/editado.
 *
 * Não é um Aggregate Root — só existe no contexto de um Document,
 * por isso não tem repositório próprio.
 */
export class DocumentItem {
  private constructor(
    public readonly id: string,
    public readonly source: SourceReference,
    private _star: StarContent,
    private _order: number,
  ) {}

  static createNew(source: SourceReference, order: number): DocumentItem {
    return new DocumentItem(randomUUID(), source, StarContent.empty(), order);
  }

  static reconstitute(fields: {
    id: string;
    source: SourceReference;
    star: StarContent;
    order: number;
  }): DocumentItem {
    return new DocumentItem(fields.id, fields.source, fields.star, fields.order);
  }

  get star(): StarContent {
    return this._star;
  }

  get order(): number {
    return this._order;
  }

  // Aplica o STAR gerado pela IA (RF08)
  applyGeneratedStar(star: StarContent): void {
    this._star = star;
  }

  // Limpa o STAR (usado ao forçar uma regeração completa via IA — ver
  // GenerateDocumentUseCase) — depois disso o item volta a contar como
  // "pendente" para fins de retomada em caso de falha.
  resetStar(): void {
    this._star = StarContent.empty();
  }

  // Reordenação (via IA ou manual) — ver Document.reorderItems
  reorder(newOrder: number): void {
    this._order = newOrder;
  }

  // Edição manual de um ou mais campos do STAR (RF09)
  editStar(fields: Partial<{
    situation: string | null;
    task: string | null;
    action: string | null;
    result: string | null;
  }>): void {
    this._star = this._star.withUpdatedFields(fields);
  }
}
