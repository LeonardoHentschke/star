import { Document } from '../../domain/document.entity';

/**
 * Porta (interface): exportação do documento final em PDF (RF11).
 * Implementada em infrastructure/pdf com pdfkit.
 */
export interface PdfExporterPort {
  export(document: Document): Promise<Buffer>;
}

export const PDF_EXPORTER = Symbol('PDF_EXPORTER');
