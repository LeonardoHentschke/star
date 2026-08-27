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
    // `items` é eager em DocumentOrmEntity, então já vem carregado.
    const doc = await this.ormRepo.findOne({ where: { id: documentId } });
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
        merged: item.merged,
        additions: item.additions,
        deletions: item.deletions,
        rawSnapshot: item.rawSnapshot,
      })),
    };
  }
}
