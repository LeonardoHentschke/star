import { z } from 'zod';

/**
 * DTOs do módulo Documents definidos com Zod.
 * Cada schema é a fonte da verdade para validação (via ZodValidationPipe)
 * e também gera o tipo TypeScript correspondente com z.infer.
 */

// POST /documents — criar um novo documento (RF10)
export const CreateDocumentSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  periodStart: z.string().date(), // formato "YYYY-MM-DD"
  periodEnd: z.string().date(),
});
export type CreateDocumentDto = z.infer<typeof CreateDocumentSchema>;

// POST /documents/:id/items — selecionar itens de origem (Jira/GitHub) para o documento (RF06, RF07)
// O enriquecimento com dados do GitHub (additions/deletions/merged, etc.) e a busca das
// PRs vinculadas de cada tarefa Jira (via `jiraIssueId`) são feitos no backend
// (AddDocumentItemsUseCase), não recebidos do cliente — evita payloads grandes e muitas
// requisições paralelas do frontend quando há centenas de tarefas selecionadas.
export const AddDocumentItemSchema = z.object({
  sourceType: z.enum(['jira', 'github_pr']),
  sourceRef: z.string().min(1),
  sourceTitle: z.string().min(1),
  sourceUrl: z.string().url().nullable().optional(),
  jiraIssueId: z.string().optional(),
  jiraStatus: z.string().nullable().optional(),
  jiraStatusCategory: z.enum(['new', 'indeterminate', 'done']).nullable().optional(),
  description: z.string().nullable().optional(),
});
export type AddDocumentItemDto = z.infer<typeof AddDocumentItemSchema>;

export const AddDocumentItemsBatchSchema = z.object({
  items: z.array(AddDocumentItemSchema).min(1),
});
export type AddDocumentItemsBatchDto = z.infer<
  typeof AddDocumentItemsBatchSchema
>;

// PATCH /documents/:id/items/:itemId — editar texto STAR gerado (RF09)
export const UpdateDocumentItemSchema = z.object({
  situation: z.string().nullable().optional(),
  task: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  result: z.string().nullable().optional(),
});
export type UpdateDocumentItemDto = z.infer<typeof UpdateDocumentItemSchema>;

// PATCH /documents/:id — editar resumo executivo (RF12) ou metadados
export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  executiveSummary: z.string().nullable().optional(),
});
export type UpdateDocumentDto = z.infer<typeof UpdateDocumentSchema>;

// POST /documents/:id/generate — disparar geração via Gemini (RF08, RF12)
export const GenerateDocumentSchema = z.object({
  regenerateSummary: z.boolean().default(true),
});
export type GenerateDocumentDto = z.infer<typeof GenerateDocumentSchema>;

// PATCH /documents/:id/favorite — marcar/desmarcar documento como favorito (tela Dashboard)
export const SetFavoriteDocumentSchema = z.object({
  favorite: z.boolean(),
});
export type SetFavoriteDocumentDto = z.infer<typeof SetFavoriteDocumentSchema>;

// PATCH /documents/:id/items/reorder — reordenar itens manualmente
export const ReorderDocumentItemsSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1),
});
export type ReorderDocumentItemsDto = z.infer<typeof ReorderDocumentItemsSchema>;
