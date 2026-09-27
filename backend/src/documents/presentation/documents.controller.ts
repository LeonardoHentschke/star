import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import {
  AddDocumentItemsBatchDto,
  AddDocumentItemsBatchSchema,
  CreateDocumentDto,
  CreateDocumentSchema,
  DocumentItemsPageQueryDto,
  DocumentItemsPageQuerySchema,
  GenerateDocumentDto,
  GenerateDocumentSchema,
  MoveDocumentItemDto,
  MoveDocumentItemSchema,
  ReorderDocumentItemsDto,
  ReorderDocumentItemsSchema,
  SetFavoriteDocumentDto,
  SetFavoriteDocumentSchema,
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
import { MoveDocumentItemUseCase } from '../application/use-cases/move-document-item.use-case';
import { GenerateDocumentUseCase } from '../application/use-cases/generate-document.use-case';
import { GenerateDocumentItemUseCase } from '../application/use-cases/generate-document-item.use-case';
import { ExportDocumentPdfUseCase } from '../application/use-cases/export-document-pdf.use-case';
import { SetFavoriteDocumentUseCase } from '../application/use-cases/set-favorite-document.use-case';
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
    private readonly moveDocumentItem: MoveDocumentItemUseCase,
    private readonly generateDocument: GenerateDocumentUseCase,
    private readonly generateDocumentItem: GenerateDocumentItemUseCase,
    private readonly exportDocumentPdf: ExportDocumentPdfUseCase,
    private readonly setFavoriteDocument: SetFavoriteDocumentUseCase,
  ) {}

  @Post()
  async create(@Body(new ZodValidationPipe(CreateDocumentSchema)) dto: CreateDocumentDto) {
    const document = await this.createDocument.execute(dto);
    return DocumentPresenter.toSummary(document);
  }

  @Get()
  async findAll() {
    const documents = await this.listDocuments.execute();
    return documents.map(({ document, stats }) => ({ ...DocumentPresenter.toSummary(document), ...stats }));
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(DocumentItemsPageQuerySchema)) query: DocumentItemsPageQueryDto,
  ) {
    if (!query.page && !query.pageSize) {
      const document = await this.getDocument.execute(id);
      return DocumentPresenter.toDetail(document);
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const { document, totalItems } = await this.getDocument.executePage(id, page, pageSize);
    return { ...DocumentPresenter.toDetail(document), totalItems, page, pageSize };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDocumentSchema)) dto: UpdateDocumentDto,
  ) {
    const document = await this.updateDocument.execute(id, dto);
    return DocumentPresenter.toDetail(document);
  }

  @Patch(':id/favorite')
  async setFavorite(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SetFavoriteDocumentSchema)) dto: SetFavoriteDocumentDto,
  ) {
    const document = await this.setFavoriteDocument.execute(id, dto.favorite);
    return DocumentPresenter.toSummary(document);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.deleteDocument.execute(id);
    return { deleted: true };
  }

  @Post(':id/items')
  @HttpCode(202)
  async addItems(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddDocumentItemsBatchSchema)) dto: AddDocumentItemsBatchDto,
  ) {
    await this.addDocumentItems.start(id, dto);
    return { accepted: true };
  }

  @Post(':id/items/resume')
  @HttpCode(202)
  async resumeAddItems(@Param('id') id: string) {
    await this.addDocumentItems.resume(id);
    return { accepted: true };
  }

  @Patch(':id/items/reorder')
  async reorderItems(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReorderDocumentItemsSchema)) dto: ReorderDocumentItemsDto,
  ) {
    const document = await this.reorderDocumentItems.execute(id, dto.itemIds);
    return DocumentPresenter.toDetail(document);
  }

  @Patch(':id/items/:itemId/move')
  @HttpCode(204)
  async moveItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(MoveDocumentItemSchema)) dto: MoveDocumentItemDto,
  ) {
    await this.moveDocumentItem.execute(id, itemId, dto.direction);
  }

  @Post(':id/items/:itemId/generate')
  async generateItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    const item = await this.generateDocumentItem.execute(id, itemId);
    return DocumentPresenter.toItem(item);
  }

  @Patch(':id/items/:itemId')
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(UpdateDocumentItemSchema)) dto: UpdateDocumentItemDto,
  ) {
    const item = await this.updateDocumentItem.execute(id, itemId, dto);
    return DocumentPresenter.toItem(item);
  }

  @Post(':id/generate')
  @HttpCode(202)
  async generate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(GenerateDocumentSchema)) dto: GenerateDocumentDto,
  ) {
    await this.generateDocument.start(id, dto.regenerateSummary);
    return { accepted: true };
  }

  @Post(':id/generate/resume')
  @HttpCode(202)
  async resumeGenerate(@Param('id') id: string) {
    await this.generateDocument.resume(id);
    return { accepted: true };
  }

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
