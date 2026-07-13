import { z } from 'zod';

export const PrimitiveType = {
  INT: 'int',
  FLOAT: 'float',
  STRING: 'string',
  BOOLEAN: 'boolean',
} as const;

export const PrimitiveTypeSchema = z.enum(
  Object.values(PrimitiveType) as [string, ...string[]],
);
export type PrimitiveType = z.infer<typeof PrimitiveTypeSchema>;

export const SemanticType = {
  NUMERIC: 'numeric',
  CATEGORICAL: 'categorical',
  TEXT: 'text',
  DATETIME: 'datetime',
} as const;

export const SemanticTypeSchema = z.enum(
  Object.values(SemanticType) as [string, ...string[]],
);
export type SemanticType = z.infer<typeof SemanticTypeSchema>;
