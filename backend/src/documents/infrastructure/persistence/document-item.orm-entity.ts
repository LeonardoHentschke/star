import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { DocumentOrmEntity } from './document.orm-entity';

@Entity('document_items')
export class DocumentItemOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @ManyToOne(() => DocumentOrmEntity, (document) => document.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: DocumentOrmEntity;

  @Column({ name: 'document_id' })
  documentId: string;

  @Column({ type: 'enum', enum: ['jira', 'github_pr'] })
  sourceType: 'jira' | 'github_pr';

  @Column({ type: 'varchar', length: 255 })
  sourceRef: string;

  @Column({ type: 'varchar', length: 500 })
  sourceTitle: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  sourceUrl: string | null;

  @Column({ type: 'json', nullable: true })
  rawSnapshot: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  jiraStatus: string | null;

  @Column({ type: 'boolean', nullable: true })
  jiraDone: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  merged: boolean | null;

  @Column({ type: 'int', default: 0 })
  additions: number;

  @Column({ type: 'int', default: 0 })
  deletions: number;

  @Column({ type: 'int', default: 0 })
  changedFiles: number;

  @Column({ type: 'text', nullable: true })
  situation: string | null;

  @Column({ type: 'text', nullable: true })
  task: string | null;

  @Column({ type: 'text', nullable: true })
  action: string | null;

  @Column({ type: 'text', nullable: true })
  result: string | null;

  @Column({ type: 'int', default: 0 })
  order: number;
}
