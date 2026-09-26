import { randomUUID } from 'crypto';
import { StarContent } from './value-objects/star-content.vo';
import { SourceReference } from './value-objects/source-reference.vo';

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

  applyGeneratedStar(star: StarContent): void {
    this._star = star;
  }

  resetStar(): void {
    this._star = StarContent.empty();
  }

  reorder(newOrder: number): void {
    this._order = newOrder;
  }

  editStar(fields: Partial<{
    situation: string | null;
    task: string | null;
    action: string | null;
    result: string | null;
  }>): void {
    this._star = this._star.withUpdatedFields(fields);
  }
}
