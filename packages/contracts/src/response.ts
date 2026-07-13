import { z } from "zod";

export const PaginatedMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const createApiResponseSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    data: schema,
  });

export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(
  schema: T,
) =>
  z.object({
    data: z.array(schema),
    meta: PaginatedMetaSchema,
  });

export type PaginatedMeta = z.infer<typeof PaginatedMetaSchema>;

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginatedMeta;
}
