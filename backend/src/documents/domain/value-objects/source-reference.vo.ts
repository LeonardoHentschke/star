export type SourceType = 'jira' | 'github_pr';

/**
 * Value Object: identifica a origem externa de um DocumentItem
 * (uma tarefa do Jira ou um Pull Request do GitHub), preservando
 * um snapshot dos dados brutos para permitir reprocessamento futuro
 * sem precisar buscar de novo na API externa.
 */
export class SourceReference {
  private constructor(
    public readonly sourceType: SourceType,
    public readonly sourceRef: string, // ex: "PROJ-123" ou "42"
    public readonly title: string,
    public readonly url: string | null,
    public readonly rawSnapshot: Record<string, unknown> | null,
  ) {}

  static create(fields: {
    sourceType: SourceType;
    sourceRef: string;
    title: string;
    url?: string | null;
    rawSnapshot?: Record<string, unknown> | null;
  }): SourceReference {
    return new SourceReference(
      fields.sourceType,
      fields.sourceRef,
      fields.title,
      fields.url ?? null,
      fields.rawSnapshot ?? null,
    );
  }

  get description(): string | null {
    const value = this.rawSnapshot?.['description'];
    return typeof value === 'string' ? value : null;
  }
}
