import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import {
  AddDocumentItemsBatchDto,
  AddDocumentItemsBatchSchema,
  CreateDocumentDto,
  CreateDocumentSchema,
  GenerateDocumentDto,
  GenerateDocumentSchema,
  ReorderDocumentItemsDto,
  ReorderDocumentItemsSchema,
  UpdateDocumentDto,
  UpdateDocumentItemDto,
  UpdateDocumentItemSchema,
  UpdateDocumentSchema,
} from '../application/dto/document.dto';
import { CreateDocumentUseCase } from '../application/use-cases/create-document.use-case';
import { ListDocumentsUseCase } from '../application/use-cases/list-documents.use-case';
import { GetDocumentUseCase } from '../application/use-cases/get-document.use-case';
import { UpdateDocumentUseCase } from '../application/use-cases/update-document.use-case';
import { DeleteDocumentUseCase } from '../application/use-cases/delete-document.use-case';
import { AddDocumentItemsUseCase } from '../application/use-cases/add-document-items.use-case';
import { UpdateDocumentItemUseCase } from '../application/use-cases/update-document-item.use-case';
import { ReorderDocumentItemsUseCase } from '../application/use-cases/reorder-document-items.use-case';
import { GenerateDocumentUseCase } from '../application/use-cases/generate-document.use-case';
import { ExportDocumentPdfUseCase } from '../application/use-cases/export-document-pdf.use-case';
import { DocumentPresenter } from './document.presenter';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly createDocument: CreateDocumentUseCase,
    private readonly listDocuments: ListDocumentsUseCase,
    private readonly getDocument: GetDocumentUseCase,
    private readonly updateDocument: UpdateDocumentUseCase,
    private readonly deleteDocument: DeleteDocumentUseCase,
    private readonly addDocumentItems: AddDocumentItemsUseCase,
    private readonly updateDocumentItem: UpdateDocumentItemUseCase,
    private readonly reorderDocumentItems: ReorderDocumentItemsUseCase,
    private readonly generateDocument: GenerateDocumentUseCase,
    private readonly exportDocumentPdf: ExportDocumentPdfUseCase,
  ) {}

  // RF10
  @Post()
  async create(@Body(new ZodValidationPipe(CreateDocumentSchema)) dto: CreateDocumentDto) {
    const document = await this.createDocument.execute(dto);
    return DocumentPresenter.toSummary(document);
  }

  // RF10
  @Get()
  async findAll() {
    const documents = await this.listDocuments.execute();
    return documents.map(DocumentPresenter.toSummary);
  }

  // RF10
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const document = await this.getDocument.execute(id);
    return DocumentPresenter.toDetail(document);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDocumentSchema)) dto: UpdateDocumentDto,
  ) {
    const document = await this.updateDocument.execute(id, dto);
    return DocumentPresenter.toDetail(document);
  }

  // RF10
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.deleteDocument.execute(id);
    return { deleted: true };
  }

  // RF06/RF07 — selecionar itens de Jira/GitHub para o documento
  @Post(':id/items')
  async addItems(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddDocumentItemsBatchSchema)) dto: AddDocumentItemsBatchDto,
  ) {
    const document = await this.addDocumentItems.execute(id, dto);
    return DocumentPresenter.toDetail(document);
  }

  // Reordenação manual dos itens (usuário não concorda com a ordem sugerida pela
  // IA, ou escreveu o documento manualmente). Precisa vir antes de
  // ':id/items/:itemId' para não ser capturada pela rota dinâmica.
  @Patch(':id/items/reorder')
  async reorderItems(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReorderDocumentItemsSchema)) dto: ReorderDocumentItemsDto,
  ) {
    const document = await this.reorderDocumentItems.execute(id, dto.itemIds);
    return DocumentPresenter.toDetail(document);
  }

  // RF09 — editar texto STAR de um item
  @Patch(':id/items/:itemId')
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(UpdateDocumentItemSchema)) dto: UpdateDocumentItemDto,
  ) {
    const document = await this.updateDocumentItem.execute(id, itemId, dto);
    return DocumentPresenter.toDetail(document);
  }

  // RF08 + RF12 — gerar textos STAR e resumo executivo via IA
  @Post(':id/generate')
  async generate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(GenerateDocumentSchema)) dto: GenerateDocumentDto,
  ) {
    const document = await this.generateDocument.execute(id, dto.regenerateSummary);
    return DocumentPresenter.toDetail(document);
  }

  // RF11 — exportar PDF
  @Get(':id/export/pdf')
  async exportPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.exportDocumentPdf.execute(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="documento-${id}.pdf"`,
    });
    res.send(buffer);
  }
}
