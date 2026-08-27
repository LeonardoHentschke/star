import { randomUUID } from 'crypto';
import { DocumentItem } from './document-item.entity';
import { Period } from './value-objects/period.vo';
import { SourceReference } from './value-objects/source-reference.vo';
import { StarContent } from './value-objects/star-content.vo';
import { DocumentItemNotFoundError } from './errors/document-domain.errors';

/**
 * Aggregate Root do bounded context "Documents".
 *
 * Um Document representa um relatório de avaliação de desempenho no
 * formato STAR, composto por vários DocumentItem (tarefas Jira / PRs do
 * GitHub selecionados pelo usuário) e um resumo executivo geral.
 *
 * Todas as mutações do agregado passam por métodos aqui — nunca se edita
 * um DocumentItem diretamente de fora (mantém as invariantes do agregado).
 */
export class Document {
  private constructor(
    public readonly id: string,
    private _title: string,
    private _period: Period,
    private _executiveSummary: string | null,
    private _items: DocumentItem[],
    public readonly createdAt: Date,
  ) {}

  // RF10 — criar um novo documento
  static createNew(title: string, periodStart: string, periodEnd: string): Document {
    return new Document(
      randomUUID(),
      title,
      Period.create(periodStart, periodEnd),
      null,
      [],
      new Date(),
    );
  }

  // Usado pela camada de infraestrutura ao carregar do banco — não valida de novo
  // regras que já foram validadas na criação (ex: período), apenas reconstrói o objeto.
  static reconstitute(fields: {
    id: string;
    title: string;
    period: Period;
    executiveSummary: string | null;
    items: DocumentItem[];
    createdAt: Date;
  }): Document {
    return new Document(
      fields.id,
      fields.title,
      fields.period,
      fields.executiveSummary,
      fields.items,
      fields.createdAt,
    );
  }

  get title(): string {
    return this._title;
  }

  get period(): Period {
    return this._period;
  }

  get executiveSummary(): string | null {
    return this._executiveSummary;
  }

  get items(): readonly DocumentItem[] {
    return this._items;
  }

  rename(title: string): void {
    this._title = title;
  }

  // RF06/RF07 — adicionar itens selecionados de Jira/GitHub ao documento
  addItem(source: SourceReference): DocumentItem {
    const nextOrder = this._items.length;
    const item = DocumentItem.createNew(source, nextOrder);
    this._items.push(item);
    return item;
  }

  // RF08 — aplica o STAR gerado pela IA a um item específico
  applyGeneratedStarToItem(itemId: string, star: StarContent): void {
    this.findItemOrThrow(itemId).applyGeneratedStar(star);
  }

  // RF09 — edição manual de um item
  editItemStar(
    itemId: string,
    fields: Partial<{ situation: string | null; task: string | null; action: string | null; result: string | null }>,
  ): void {
    this.findItemOrThrow(itemId).editStar(fields);
  }

  // RF12 — define o resumo executivo geral (gerado por IA, editável)
  setExecutiveSummary(summary: string | null): void {
    this._executiveSummary = summary;
  }

  // Reordena os itens (usado tanto pelo ranking de impacto via IA quanto pela
  // reordenação manual do usuário). Ids desconhecidos são ignorados; itens do
  // documento ausentes de `orderedIds` vão para o final, preservando a ordem
  // relativa atual entre eles.
  reorderItems(orderedIds: string[]): void {
    const byId = new Map(this._items.map((item) => [item.id, item]));
    const ranked = orderedIds
      .map((id) => byId.get(id))
      .filter((item): item is DocumentItem => item !== undefined);
    const rankedIds = new Set(ranked.map((item) => item.id));
    const rest = this._items.filter((item) => !rankedIds.has(item.id));

    this._items = [...ranked, ...rest];
    this._items.forEach((item, index) => item.reorder(index));
  }

  // Regra de negócio: só itens com STAR completo entram no material usado
  // para gerar o resumo executivo — item incompleto não deveria "contar"
  // no resumo geral do documento.
  itemsWithCompleteStar(): DocumentItem[] {
    return this._items.filter((item) => item.star.isComplete());
  }

  private findItemOrThrow(itemId: string): DocumentItem {
    const item = this._items.find((i) => i.id === itemId);
    if (!item) throw new DocumentItemNotFoundError(itemId);
    return item;
  }
}
