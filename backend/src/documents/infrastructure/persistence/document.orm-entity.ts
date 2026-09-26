import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentItemOrmEntity } from './document-item.orm-entity';

@Entity('documents')
export class DocumentOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  @Column({ type: 'text', nullable: true })
  executiveSummary: string | null;

  @OneToMany(() => DocumentItemOrmEntity, (item) => item.document, {
    cascade: true,
    eager: true,
  })
  items: DocumentItemOrmEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'boolean', default: false })
  favorite: boolean;

  @Column({ type: 'enum', enum: ['idle', 'processing', 'failed'], default: 'idle' })
  jobStatus: 'idle' | 'processing' | 'failed';

  @Column({ type: 'enum', enum: ['add_items', 'generate'], nullable: true })
  jobType: 'add_items' | 'generate' | null;

  @Column({ type: 'text', nullable: true })
  jobError: string | null;

  @Column({ type: 'int', nullable: true })
  jobProgressDone: number | null;

  @Column({ type: 'int', nullable: true })
  jobProgressTotal: number | null;

  @Column({ type: 'json', nullable: true })
  jobPayload: Record<string, unknown> | null;
}
