import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentOrmEntity } from './infrastructure/persistence/document.orm-entity';
import { DocumentItemOrmEntity } from './infrastructure/persistence/document-item.orm-entity';
import { TypeOrmDocumentRepository } from './infrastructure/persistence/typeorm-document.repository';
import { DOCUMENT_REPOSITORY } from './domain/document.repository';
import { PdfKitDocumentExporter } from './infrastructure/pdf/pdfkit-document-exporter';
import { PDF_EXPORTER } from './application/ports/pdf-exporter.port';
import { AiModule } from '../ai/ai.module';

import { DocumentsController } from './presentation/documents.controller';
import { CreateDocumentUseCase } from './application/use-cases/create-document.use-case';
import { ListDocumentsUseCase } from './application/use-cases/list-documents.use-case';
import { GetDocumentUseCase } from './application/use-cases/get-document.use-case';
import { UpdateDocumentUseCase } from './application/use-cases/update-document.use-case';
import { DeleteDocumentUseCase } from './application/use-cases/delete-document.use-case';
import { AddDocumentItemsUseCase } from './application/use-cases/add-document-items.use-case';
import { UpdateDocumentItemUseCase } from './application/use-cases/update-document-item.use-case';
import { ReorderDocumentItemsUseCase } from './application/use-cases/reorder-document-items.use-case';
import { GenerateDocumentUseCase } from './application/use-cases/generate-document.use-case';
import { ExportDocumentPdfUseCase } from './application/use-cases/export-document-pdf.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentOrmEntity, DocumentItemOrmEntity]), AiModule],
  controllers: [DocumentsController],
  providers: [
    // Wiring das portas do domínio/aplicação para suas implementações concretas
    { provide: DOCUMENT_REPOSITORY, useClass: TypeOrmDocumentRepository },
    { provide: PDF_EXPORTER, useClass: PdfKitDocumentExporter },

    // Casos de uso
    CreateDocumentUseCase,
    ListDocumentsUseCase,
    GetDocumentUseCase,
    UpdateDocumentUseCase,
    DeleteDocumentUseCase,
    AddDocumentItemsUseCase,
    UpdateDocumentItemUseCase,
    ReorderDocumentItemsUseCase,
    GenerateDocumentUseCase,
    ExportDocumentPdfUseCase,
  ],
})
export class DocumentsModule {}
