export type SourceType = 'jira' | 'github_pr';

export class SourceReference {
  private constructor(
    public readonly sourceType: SourceType,
    public readonly sourceRef: string,
    public readonly title: string,
    public readonly url: string | null,
    public readonly rawSnapshot: Record<string, unknown> | null,
    public readonly jiraStatus: string | null,
    public readonly jiraDone: boolean | null,
    public readonly merged: boolean | null,
    public readonly additions: number,
    public readonly deletions: number,
    public readonly changedFiles: number,
  ) {}

  static create(fields: {
    sourceType: SourceType;
    sourceRef: string;
    title: string;
    url?: string | null;
    rawSnapshot?: Record<string, unknown> | null;
    jiraStatus?: string | null;
    jiraDone?: boolean | null;
    merged?: boolean | null;
    additions?: number;
    deletions?: number;
    changedFiles?: number;
  }): SourceReference {
    return new SourceReference(
      fields.sourceType,
      fields.sourceRef,
      fields.title,
      fields.url ?? null,
      fields.rawSnapshot ?? null,
      fields.jiraStatus ?? null,
      fields.jiraDone ?? null,
      fields.merged ?? null,
      fields.additions ?? 0,
      fields.deletions ?? 0,
      fields.changedFiles ?? 0,
    );
  }

  get description(): string | null {
    const value = this.rawSnapshot?.['description'];
    return typeof value === 'string' ? value : null;
  }
}
