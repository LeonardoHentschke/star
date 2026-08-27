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
