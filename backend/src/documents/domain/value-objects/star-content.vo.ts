export class StarContent {
  private constructor(
    public readonly situation: string | null,
    public readonly task: string | null,
    public readonly action: string | null,
    public readonly result: string | null,
  ) {}

  static empty(): StarContent {
    return new StarContent(null, null, null, null);
  }

  static create(fields: {
    situation: string | null;
    task: string | null;
    action: string | null;
    result: string | null;
  }): StarContent {
    return new StarContent(fields.situation, fields.task, fields.action, fields.result);
  }

  withUpdatedFields(fields: Partial<{
    situation: string | null;
    task: string | null;
    action: string | null;
    result: string | null;
  }>): StarContent {
    return new StarContent(
      fields.situation !== undefined ? fields.situation : this.situation,
      fields.task !== undefined ? fields.task : this.task,
      fields.action !== undefined ? fields.action : this.action,
      fields.result !== undefined ? fields.result : this.result,
    );
  }

  isComplete(): boolean {
    return !!(this.situation && this.task && this.action && this.result);
  }
}
