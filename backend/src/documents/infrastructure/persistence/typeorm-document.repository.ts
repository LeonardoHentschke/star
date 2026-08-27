import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../domain/document.entity';
import { DocumentItem } from '../../domain/document-item.entity';
import { DocumentRepository } from '../../domain/document.repository';
import { Period } from '../../domain/value-objects/period.vo';
import { StarContent } from '../../domain/value-objects/star-content.vo';
import { SourceReference } from '../../domain/value-objects/source-reference.vo';
import { DocumentOrmEntity } from './document.orm-entity';
import { DocumentItemOrmEntity } from './document-item.orm-entity';

/**
 * Adaptador de persistência: implementa a porta `DocumentRepository`
 * (definida no domínio) usando TypeORM/MariaDB. É a única classe do
 * sistema que sabe converter entre entidades de domínio e modelos ORM.
 */
@Injectable()
export class TypeOrmDocumentRepository implements DocumentRepository {
  constructor(
    @InjectRepository(DocumentOrmEntity)
    private readonly ormRepo: Repository<DocumentOrmEntity>,
  ) {}

  async save(document: Document): Promise<void> {
    await this.ormRepo.save(this.toOrm(document));
  }

  async findById(id: string): Promise<Document | null> {
    const row = await this.ormRepo.findOne({
      where: { id },
      relations: { items: true },
      order: { items: { order: 'ASC' } },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Document[]> {
    const rows = await this.ormRepo.find({ order: { createdAt: 'DESC' } });
    return rows.map((row) => this.toDomain(row));
  }

  async delete(id: string): Promise<void> {
    await this.ormRepo.delete({ id });
  }

  private toOrm(document: Document): DocumentOrmEntity {
    const orm = new DocumentOrmEntity();
    orm.id = document.id;
    orm.title = document.title;
    orm.periodStart = document.period.start;
    orm.periodEnd = document.period.end;
    orm.executiveSummary = document.executiveSummary;
    orm.items = document.items.map((item) => {
      const itemOrm = new DocumentItemOrmEntity();
      itemOrm.id = item.id;
      itemOrm.documentId = document.id;
      itemOrm.sourceType = item.source.sourceType;
      itemOrm.sourceRef = item.source.sourceRef;
      itemOrm.sourceTitle = item.source.title;
      itemOrm.sourceUrl = item.source.url;
      itemOrm.rawSnapshot = item.source.rawSnapshot;
      itemOrm.situation = item.star.situation;
      itemOrm.task = item.star.task;
      itemOrm.action = item.star.action;
      itemOrm.result = item.star.result;
      itemOrm.order = item.order;
      return itemOrm;
    });
    return orm;
  }

  private toDomain(row: DocumentOrmEntity): Document {
    const items = (row.items ?? [])
      .sort((a, b) => a.order - b.order)
      .map((itemRow) =>
        DocumentItem.reconstitute({
          id: itemRow.id,
          source: SourceReference.create({
            sourceType: itemRow.sourceType,
            sourceRef: itemRow.sourceRef,
            title: itemRow.sourceTitle,
            url: itemRow.sourceUrl,
            rawSnapshot: itemRow.rawSnapshot,
          }),
          star: StarContent.create({
            situation: itemRow.situation,
            task: itemRow.task,
            action: itemRow.action,
            result: itemRow.result,
          }),
          order: itemRow.order,
        }),
      );

    return Document.reconstitute({
      id: row.id,
      title: row.title,
      period: Period.create(row.periodStart, row.periodEnd),
      executiveSummary: row.executiveSummary,
      items,
      createdAt: row.createdAt,
    });
  }
}
