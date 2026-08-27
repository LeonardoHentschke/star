import { Inject, Injectable } from '@nestjs/common';
import { Document } from '../../domain/document.entity';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../domain/document.repository';
import { DocumentNotFoundError } from '../../domain/errors/document-domain.errors';
import { UpdateDocumentItemDto } from '../dto/document.dto';

/**
 * Carrega o agregado Document inteiro para editar um item — mantém a
 * consistência do agregado (não se edita um DocumentItem isoladamente
 * fora do ciclo de vida do Document, é assim que o TypeORM vai persistir
 * a mudança também).
 */
@Injectable()
export class UpdateDocumentItemUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
  ) {}

  async execute(documentId: string, itemId: string, dto: UpdateDocumentItemDto): Promise<Document> {
    const document = await this.repo.findById(documentId);
    if (!document) throw new DocumentNotFoundError(documentId);

    document.editItemStar(itemId, {
      situation: dto.situation,
      task: dto.task,
      action: dto.action,
      result: dto.result,
    });

    await this.repo.save(document);
    return document;
  }
}
