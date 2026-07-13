import { z } from 'zod';

export const CreateBlockCategorySchema = z.object({
  name: z.string().min(1),
});

export const UpdateBlockCategorySchema = CreateBlockCategorySchema.partial();

export const BlockCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export type CreateBlockCategory = z.infer<typeof CreateBlockCategorySchema>;
export type UpdateBlockCategory = z.infer<typeof UpdateBlockCategorySchema>;
export type BlockCategory = z.infer<typeof BlockCategorySchema>;

import { createPaginatedResponseSchema } from "../response";
export const PaginatedBlockCategoryResponseSchema = createPaginatedResponseSchema(BlockCategorySchema);
