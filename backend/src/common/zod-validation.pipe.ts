import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * Pipe genérico para validar o body/params de uma rota com um schema Zod.
 *
 * Uso no controller:
 *   @Post()
 *   create(@Body(new ZodValidationPipe(CreateDocumentSchema)) dto: CreateDocumentDto) { ... }
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Dados inválidos',
        issues: result.error.issues,
      });
    }
    return result.data;
  }
}
