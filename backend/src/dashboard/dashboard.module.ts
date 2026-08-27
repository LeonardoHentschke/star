import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentOrmEntity } from '../documents/infrastructure/persistence/document.orm-entity';
import { DASHBOARD_QUERY } from './application/ports/dashboard-query.port';
import { TypeOrmDashboardQueryRepository } from './infrastructure/persistence/typeorm-dashboard-query.repository';
import { GetDashboardSummaryUseCase } from './application/use-cases/get-dashboard-summary.use-case';
import { DashboardController } from './presentation/dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentOrmEntity])],
  controllers: [DashboardController],
  providers: [
    { provide: DASHBOARD_QUERY, useClass: TypeOrmDashboardQueryRepository },
    GetDashboardSummaryUseCase,
  ],
})
export class DashboardModule {}
