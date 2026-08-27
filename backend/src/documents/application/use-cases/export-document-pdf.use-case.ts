import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentNotFoundError } from '../../domain/errors/document-domain.errors';
import { PDF_EXPORTER, PdfExporterPort } from '../ports/pdf-exporter.port';

@Injectable()
export class ExportDocumentPdfUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
    @Inject(PDF_EXPORTER) private readonly pdfExporter: PdfExporterPort,
  ) {}

  async execute(documentId: string): Promise<Buffer> {
    const document = await this.repo.findById(documentId);
    if (!document) throw new DocumentNotFoundError(documentId);
    return this.pdfExporter.export(document);
  }
}
