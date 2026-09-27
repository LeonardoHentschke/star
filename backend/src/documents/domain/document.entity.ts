import { randomUUID } from 'crypto';
import { DocumentItem } from './document-item.entity';
import { Period } from './value-objects/period.vo';
import { SourceReference } from './value-objects/source-reference.vo';
import { StarContent } from './value-objects/star-content.vo';
import { DocumentItemNotFoundError } from './errors/document-domain.errors';

export type DocumentJobStatus = 'idle' | 'processing' | 'failed';
export type DocumentJobType = 'add_items' | 'generate';

export class Document {
  private constructor(
    public readonly id: string,
    private _title: string,
    private _period: Period,
    private _executiveSummary: string | null,
    private _items: DocumentItem[],
    public readonly createdAt: Date,
    private _favorite: boolean,
    private _jobStatus: DocumentJobStatus,
    private _jobType: DocumentJobType | null,
    private _jobError: string | null,
    private _jobProgress: { done: number; total: number } | null,
    private _jobPayload: Record<string, unknown> | null,
  ) {}

  static createNew(title: string, periodStart: string, periodEnd: string): Document {
    return new Document(
      randomUUID(),
      title,
      Period.create(periodStart, periodEnd),
      null,
      [],
      new Date(),
      false,
      'idle',
      null,
      null,
      null,
      null,
    );
  }

  static reconstitute(fields: {
    id: string;
    title: string;
    period: Period;
    executiveSummary: string | null;
    items: DocumentItem[];
    createdAt: Date;
    favorite: boolean;
    jobStatus: DocumentJobStatus;
    jobType: DocumentJobType | null;
    jobError: string | null;
    jobProgress: { done: number; total: number } | null;
    jobPayload: Record<string, unknown> | null;
  }): Document {
    return new Document(
      fields.id,
      fields.title,
      fields.period,
      fields.executiveSummary,
      fields.items,
      fields.createdAt,
      fields.favorite,
      fields.jobStatus,
      fields.jobType,
      fields.jobError,
      fields.jobProgress,
      fields.jobPayload,
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

  get favorite(): boolean {
    return this._favorite;
  }

  get jobStatus(): DocumentJobStatus {
    return this._jobStatus;
  }

  get jobType(): DocumentJobType | null {
    return this._jobType;
  }

  get jobError(): string | null {
    return this._jobError;
  }

  get jobProgress(): { done: number; total: number } | null {
    return this._jobProgress;
  }

  get jobPayload(): Record<string, unknown> | null {
    return this._jobPayload;
  }

  rename(title: string): void {
    this._title = title;
  }

  setFavorite(value: boolean): void {
    this._favorite = value;
  }

  addItem(source: SourceReference): DocumentItem {
    const nextOrder = this._items.length;
    const item = DocumentItem.createNew(source, nextOrder);
    this._items.push(item);
    return item;
  }

  applyGeneratedStarToItem(itemId: string, star: StarContent): DocumentItem {
    const item = this.findItemOrThrow(itemId);
    item.applyGeneratedStar(star);
    return item;
  }

  resetAllStars(): void {
    this._items.forEach((item) => item.resetStar());
  }

  editItemStar(
    itemId: string,
    fields: Partial<{ situation: string | null; task: string | null; action: string | null; result: string | null }>,
  ): DocumentItem {
    const item = this.findItemOrThrow(itemId);
    item.editStar(fields);
    return item;
  }

  setExecutiveSummary(summary: string | null): void {
    this._executiveSummary = summary;
  }

  moveItem(itemId: string, direction: 'up' | 'down'): DocumentItem[] {
    const index = this._items.findIndex((item) => item.id === itemId);
    if (index < 0) throw new DocumentItemNotFoundError(itemId);

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= this._items.length) return [];

    [this._items[index], this._items[targetIndex]] = [this._items[targetIndex], this._items[index]];
    this._items[index].reorder(index);
    this._items[targetIndex].reorder(targetIndex);
    return [this._items[index], this._items[targetIndex]];
  }

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

  itemsWithCompleteStar(): DocumentItem[] {
    return this._items.filter((item) => item.star.isComplete());
  }

  private findItemOrThrow(itemId: string): DocumentItem {
    const item = this._items.find((i) => i.id === itemId);
    if (!item) throw new DocumentItemNotFoundError(itemId);
    return item;
  }
}
