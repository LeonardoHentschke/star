import { Document } from '../../domain/document.entity';

export interface PdfExporterPort {
  export(document: Document): Promise<Buffer>;
}

export const PDF_EXPORTER = Symbol('PDF_EXPORTER');
