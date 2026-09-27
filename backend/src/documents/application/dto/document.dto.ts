import { z } from 'zod';

export const CreateDocumentSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
});
export type CreateDocumentDto = z.infer<typeof CreateDocumentSchema>;

export const AddDocumentItemSchema = z.object({
  sourceType: z.enum(['jira', 'github_pr']),
  sourceRef: z.string().min(1),
  sourceTitle: z.string().min(1),
  sourceUrl: z.string().url().nullable().optional(),
  jiraIssueId: z.string().optional(),
  jiraStatus: z.string().nullable().optional(),
  jiraStatusCategory: z.enum(['new', 'indeterminate', 'done']).nullable().optional(),
  jiraIssueType: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});
export type AddDocumentItemDto = z.infer<typeof AddDocumentItemSchema>;

export const AddDocumentItemsBatchSchema = z.object({
  items: z.array(AddDocumentItemSchema).min(1),
});
export type AddDocumentItemsBatchDto = z.infer<
  typeof AddDocumentItemsBatchSchema
>;

export const UpdateDocumentItemSchema = z.object({
  situation: z.string().nullable().optional(),
  task: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  result: z.string().nullable().optional(),
});
export type UpdateDocumentItemDto = z.infer<typeof UpdateDocumentItemSchema>;

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  executiveSummary: z.string().nullable().optional(),
});
export type UpdateDocumentDto = z.infer<typeof UpdateDocumentSchema>;

export const GenerateDocumentSchema = z.object({
  regenerateSummary: z.boolean().default(true),
});
export type GenerateDocumentDto = z.infer<typeof GenerateDocumentSchema>;

export const SetFavoriteDocumentSchema = z.object({
  favorite: z.boolean(),
});
export type SetFavoriteDocumentDto = z.infer<typeof SetFavoriteDocumentSchema>;

export const DocumentItemsPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type DocumentItemsPageQueryDto = z.infer<typeof DocumentItemsPageQuerySchema>;

export const MoveDocumentItemSchema = z.object({
  direction: z.enum(['up', 'down']),
});
export type MoveDocumentItemDto = z.infer<typeof MoveDocumentItemSchema>;

export const ReorderDocumentItemsSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1),
});
export type ReorderDocumentItemsDto = z.infer<typeof ReorderDocumentItemsSchema>;
