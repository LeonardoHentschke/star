import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  DocumentDomainError,
  DocumentItemNotFoundError,
  DocumentJobAlreadyRunningError,
  DocumentJobNotResumableError,
  DocumentNotFoundError,
  InvalidPeriodError,
} from '../documents/domain/errors/document-domain.errors';

/**
 * Os use cases e o domínio lançam erros próprios (ex: DocumentNotFoundError),
 * sem depender do NestJS. Este filtro, registrado globalmente, faz a
 * tradução para o status HTTP correto na borda da aplicação.
 */
@Catch(DocumentDomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DocumentDomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof DocumentNotFoundError || exception instanceof DocumentItemNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof InvalidPeriodError
          ? HttpStatus.BAD_REQUEST
          : exception instanceof DocumentJobAlreadyRunningError || exception instanceof DocumentJobNotResumableError
            ? HttpStatus.CONFLICT
            : HttpStatus.UNPROCESSABLE_ENTITY;

    res.status(status).json({ message: exception.message });
  }
}
