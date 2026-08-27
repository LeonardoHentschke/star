import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../domain/document.repository';

// Jobs de "adicionar itens"/"gerar com IA" rodam em background dentro do
// próprio processo Nest (sem fila persistente) — se o backend reiniciar no
// meio de um (ex: hot reload em dev), o documento fica preso mostrando
// "processing" para sempre. Isso reseta esses casos para "failed" no boot,
// pra que o usuário saiba que precisa tentar de novo.
@Injectable()
export class ResetStuckJobsProvider implements OnApplicationBootstrap {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.repo.failAllProcessingJobs('Processamento interrompido (servidor reiniciado). Tente novamente.');
  }
}
