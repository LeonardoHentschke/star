import { InvalidPeriodError } from '../errors/document-domain.errors';

export class Period {
  private constructor(
    public readonly start: string,
    public readonly end: string,
  ) {}

  static create(start: string, end: string): Period {
    if (new Date(end) < new Date(start)) {
      throw new InvalidPeriodError(
        `Período inválido: fim (${end}) é anterior ao início (${start}).`,
      );
    }
    return new Period(start, end);
  }
}
