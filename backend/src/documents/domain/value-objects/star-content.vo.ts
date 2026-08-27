/**
 * Value Object: representa o conteúdo STAR (Situação, Tarefa, Ação, Resultado)
 * de um item do documento. É imutável — qualquer alteração cria uma nova instância.
 *
 * Regra de negócio: um StarContent só é considerado "completo" quando os
 * quatro campos estão preenchidos — isso é usado pelo domínio para decidir,
 * por exemplo, se um item entra no resumo executivo (RF12).
 */
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
