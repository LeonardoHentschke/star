export class DocumentDomainError extends Error {}

export class InvalidPeriodError extends DocumentDomainError {}

export class DocumentItemNotFoundError extends DocumentDomainError {
  constructor(itemId: string) {
    super(`Item ${itemId} não encontrado no documento.`);
  }
}

export class DocumentNotFoundError extends DocumentDomainError {
  constructor(documentId: string) {
    super(`Documento ${documentId} não encontrado.`);
  }
}

export class DocumentJobAlreadyRunningError extends DocumentDomainError {
  constructor(documentId: string) {
    super(`Documento ${documentId} já tem um processamento em andamento.`);
  }
}

export class DocumentJobNotResumableError extends DocumentDomainError {
  constructor(documentId: string) {
    super(`Documento ${documentId} não está em um estado que permite retomar o processamento.`);
  }
}
