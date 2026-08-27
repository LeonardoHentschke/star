import 'reflect-metadata';
import { json } from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './common/domain-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Documentos com muitos itens (centenas de tarefas do Jira) passam do
  // limite padrão de 100kb do body-parser — 5mb dá bastante margem.
  app.use(json({ limit: '5mb' }));

  // Frontend roda em outra origem (5173) — libera CORS para uso local.
  app.enableCors({ origin: true });

  // Traduz erros de domínio (ex: DocumentNotFoundError) em respostas HTTP
  app.useGlobalFilters(new DomainExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Star backend rodando em http://localhost:${port}`);
}
bootstrap();
