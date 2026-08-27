import { InvalidPeriodError } from '../errors/document-domain.errors';

/**
 * Value Object: período (início/fim) coberto por um documento.
 * Garante a invariante de que o fim não pode ser anterior ao início.
 */
export class Period {
  private constructor(
    public readonly start: string, // "YYYY-MM-DD"
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
