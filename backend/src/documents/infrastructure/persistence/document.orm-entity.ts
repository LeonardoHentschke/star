import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentItemOrmEntity } from './document-item.orm-entity';

/**
 * Modelo de persistência (TypeORM) — não é o mesmo objeto que a entidade
 * de domínio `Document`. O `TypeOrmDocumentRepository` é responsável por
 * converter entre os dois (ver `toDomain` / `fromDomain`).
 */
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
}
