import z from "zod";
import { PrimitiveTypeSchema, SemanticTypeSchema } from "./primitive.schema";

export const ColumnSchema = z.object({
  name: z.string(),
  primitive: PrimitiveTypeSchema,
  semantic: SemanticTypeSchema.optional(),
  nullable: z.boolean().optional(),
});

export type Column = z.infer<typeof ColumnSchema>;
