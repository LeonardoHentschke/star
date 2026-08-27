import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { GetDashboardSummaryUseCase } from '../application/use-cases/get-dashboard-summary.use-case';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getDashboardSummary: GetDashboardSummaryUseCase) {}

  @Get('summary')
  summary(
    @Query('documentId') documentId?: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    if (!documentId) throw new BadRequestException('documentId é obrigatório');
    return this.getDashboardSummary.execute({ documentId, periodStart, periodEnd });
  }
}
