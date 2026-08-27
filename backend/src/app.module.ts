import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './documents/documents.module';
import { JiraModule } from './jira/jira.module';
import { GithubModule } from './github/github.module';
import { AiModule } from './ai/ai.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    DocumentsModule,
    JiraModule,
    GithubModule,
    AiModule,
    DashboardModule,
  ],
})
export class AppModule {}
