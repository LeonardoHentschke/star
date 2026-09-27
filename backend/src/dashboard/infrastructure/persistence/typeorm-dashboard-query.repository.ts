import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentOrmEntity } from '../../../documents/infrastructure/persistence/document.orm-entity';
import { DashboardDocument, DashboardQueryPort } from '../../application/ports/dashboard-query.port';

@Injectable()
export class TypeOrmDashboardQueryRepository implements DashboardQueryPort {
  constructor(
    @InjectRepository(DocumentOrmEntity)
    private readonly ormRepo: Repository<DocumentOrmEntity>,
  ) {}

  async findDocumentById(documentId: string): Promise<DashboardDocument | null> {
    const doc = await this.ormRepo.findOne({
      where: { id: documentId },
      relations: { items: true },
      relationLoadStrategy: 'query',
      select: {
        id: true,
        title: true,
        periodStart: true,
        periodEnd: true,
        items: {
          id: true,
          documentId: true,
          sourceType: true,
          sourceRef: true,
          sourceTitle: true,
          sourceUrl: true,
          jiraStatus: true,
          jiraDone: true,
          jiraIssueType: true,
          merged: true,
          additions: true,
          deletions: true,
          rawSnapshot: true,
        },
      },
    });
    if (!doc) return null;

    return {
      id: doc.id,
      title: doc.title,
      periodStart: doc.periodStart,
      periodEnd: doc.periodEnd,
      items: (doc.items ?? []).map((item) => ({
        id: item.id,
        documentId: item.documentId,
        sourceType: item.sourceType,
        sourceRef: item.sourceRef,
        sourceTitle: item.sourceTitle,
        sourceUrl: item.sourceUrl,
        jiraStatus: item.jiraStatus,
        jiraDone: item.jiraDone,
        jiraIssueType: item.jiraIssueType,
        merged: item.merged,
        additions: item.additions,
        deletions: item.deletions,
        rawSnapshot: item.rawSnapshot,
      })),
    };
  }
}
