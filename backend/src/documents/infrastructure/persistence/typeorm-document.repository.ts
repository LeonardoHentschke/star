import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../domain/document.entity';
import { DocumentItem } from '../../domain/document-item.entity';
import { DocumentItemsPage, DocumentJobStateUpdate, DocumentRepository, DocumentStats } from '../../domain/document.repository';
import { Period } from '../../domain/value-objects/period.vo';
import { StarContent } from '../../domain/value-objects/star-content.vo';
import { SourceReference } from '../../domain/value-objects/source-reference.vo';
import { DocumentOrmEntity } from './document.orm-entity';
import { DocumentItemOrmEntity } from './document-item.orm-entity';

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
      relationLoadStrategy: 'query',
    });
    return row ? this.toDomain(row) : null;
  }

  async findByIdWithItemsPage(id: string, offset: number, limit: number): Promise<DocumentItemsPage | null> {
    const row = await this.ormRepo.findOne({ where: { id } });
    if (!row) return null;

    const [itemRows, totalItems] = await this.ormRepo.manager.getRepository(DocumentItemOrmEntity).findAndCount({
      where: { documentId: id },
      order: { order: 'ASC' },
      skip: offset,
      take: limit,
    });
    row.items = itemRows;
    return { document: this.toDomain(row), totalItems };
  }

  async findAll(): Promise<Document[]> {
    const rows = await this.ormRepo.find({ order: { createdAt: 'DESC' } });
    return rows.map((row) => this.toDomain(row));
  }

  async findAllStats(): Promise<Map<string, DocumentStats>> {
    const rows = await this.ormRepo.manager
      .getRepository(DocumentItemOrmEntity)
      .createQueryBuilder('item')
      .select('item.documentId', 'documentId')
      .addSelect('COUNT(*)', 'itemCount')
      .addSelect(
        `SUM(CASE WHEN COALESCE(item.situation, '') <> '' AND COALESCE(item.task, '') <> '' AND COALESCE(item.action, '') <> '' AND COALESCE(item.result, '') <> '' THEN 1 ELSE 0 END)`,
        'generatedCount',
      )
      .addSelect(
        `SUM(CASE WHEN item.sourceType = 'github_pr' THEN 1 ELSE COALESCE(JSON_LENGTH(item.rawSnapshot, '$.pullRequests'), 0) END)`,
        'pullRequestCount',
      )
      .groupBy('item.documentId')
      .getRawMany<{ documentId: string; itemCount: string; generatedCount: string; pullRequestCount: string }>();

    return new Map(
      rows.map((row) => [
        row.documentId,
        {
          itemCount: Number(row.itemCount),
          generatedCount: Number(row.generatedCount),
          pullRequestCount: Number(row.pullRequestCount),
        },
      ]),
    );
  }

  async delete(id: string): Promise<void> {
    await this.ormRepo.delete({ id });
  }

  async clearFavorite(): Promise<void> {
    await this.ormRepo.update({ favorite: true }, { favorite: false });
  }

  async updateJobState(id: string, state: DocumentJobStateUpdate): Promise<boolean> {
    const result = await this.ormRepo.update({ id }, state as Parameters<typeof this.ormRepo.update>[1]);
    return (result.affected ?? 0) > 0;
  }

  async failAllProcessingJobs(message: string): Promise<void> {
    await this.ormRepo.update({ jobStatus: 'processing' }, { jobStatus: 'failed', jobError: message });
  }

  async saveItem(documentId: string, item: DocumentItem): Promise<boolean> {
    const exists = await this.ormRepo.existsBy({ id: documentId });
    if (!exists) return false;

    await this.ormRepo.manager.getRepository(DocumentItemOrmEntity).save(this.itemToOrm(documentId, item));
    return true;
  }

  private toOrm(document: Document): DocumentOrmEntity {
    const orm = new DocumentOrmEntity();
    orm.id = document.id;
    orm.title = document.title;
    orm.periodStart = document.period.start;
    orm.periodEnd = document.period.end;
    orm.executiveSummary = document.executiveSummary;
    orm.favorite = document.favorite;
    orm.jobStatus = document.jobStatus;
    orm.jobType = document.jobType;
    orm.jobError = document.jobError;
    orm.jobProgressDone = document.jobProgress?.done ?? null;
    orm.jobProgressTotal = document.jobProgress?.total ?? null;
    orm.jobPayload = document.jobPayload;
    orm.items = document.items.map((item) => this.itemToOrm(document.id, item));
    return orm;
  }

  private itemToOrm(documentId: string, item: DocumentItem): DocumentItemOrmEntity {
    const itemOrm = new DocumentItemOrmEntity();
    itemOrm.id = item.id;
    itemOrm.documentId = documentId;
    itemOrm.sourceType = item.source.sourceType;
    itemOrm.sourceRef = item.source.sourceRef;
    itemOrm.sourceTitle = item.source.title;
    itemOrm.sourceUrl = item.source.url;
    itemOrm.rawSnapshot = item.source.rawSnapshot;
    itemOrm.jiraStatus = item.source.jiraStatus;
    itemOrm.jiraDone = item.source.jiraDone;
    itemOrm.jiraIssueType = item.source.jiraIssueType;
    itemOrm.merged = item.source.merged;
    itemOrm.additions = item.source.additions;
    itemOrm.deletions = item.source.deletions;
    itemOrm.changedFiles = item.source.changedFiles;
    itemOrm.situation = item.star.situation;
    itemOrm.task = item.star.task;
    itemOrm.action = item.star.action;
    itemOrm.result = item.star.result;
    itemOrm.order = item.order;
    return itemOrm;
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
            jiraStatus: itemRow.jiraStatus,
            jiraDone: itemRow.jiraDone,
            jiraIssueType: itemRow.jiraIssueType,
            merged: itemRow.merged,
            additions: itemRow.additions,
            deletions: itemRow.deletions,
            changedFiles: itemRow.changedFiles,
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
      favorite: row.favorite,
      jobStatus: row.jobStatus,
      jobType: row.jobType,
      jobError: row.jobError,
      jobProgress:
        row.jobProgressDone !== null && row.jobProgressTotal !== null
          ? { done: row.jobProgressDone, total: row.jobProgressTotal }
          : null,
      jobPayload: row.jobPayload,
    });
  }
}
