import { z } from 'zod';
import { FilterOpSchema } from './filter-condition.schema';

export const ConfigFieldType = {
  CONDITION_LIST: 'ConditionList',
  EXPRESSION: 'Expression',
  COLUMN_SELECTOR: 'ColumnSelector',
  SELECT: 'Select',
  NUMBER: 'Number',
  BOOLEAN: 'Boolean',
  TEXT: 'Text',
  FILE_UPLOAD: 'FileUpload',
  MULTI_SELECT: 'MultiSelect',
  KEY_VALUE_MAP: 'KeyValueMap',
  DATASET_SELECTOR: 'DatasetSelector',
} as const;

export const ConfigFieldTypeSchema = z.enum(
  Object.values(ConfigFieldType) as [string, ...string[]],
);
export type ConfigFieldType = z.infer<typeof ConfigFieldTypeSchema>;

export const ConfigFieldSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(ConfigFieldType.COLUMN_SELECTOR),
    id: z.string(),
    multiple: z.boolean(),
    semantic: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal(ConfigFieldType.SELECT),
    id: z.string(),
    options: z.array(z.string()),
    default: z.string().optional(),
  }),
  z.object({
    type: z.literal(ConfigFieldType.NUMBER),
    id: z.string(),
    min: z.number().optional(),
    max: z.number().optional(),
    default: z.number().optional(),
  }),
  z.object({
    type: z.literal(ConfigFieldType.BOOLEAN),
    id: z.string(),
    default: z.boolean().optional(),
  }),
  z.object({
    type: z.literal(ConfigFieldType.TEXT),
    id: z.string(),
    placeholder: z.string().optional(),
  }),
  z.object({
    type: z.literal(ConfigFieldType.FILE_UPLOAD),
    id: z.string(),
    accept: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal(ConfigFieldType.MULTI_SELECT),
    id: z.string(),
    options: z.array(z.string()).optional(),
    optionsFrom: z.string().optional(),
    optionsMap: z.record(z.string(), z.array(z.string())).optional(),
  }),
  z.object({
    type: z.literal(ConfigFieldType.KEY_VALUE_MAP),
    id: z.string(),
  }),
  z.object({
    type: z.literal(ConfigFieldType.DATASET_SELECTOR),
    id: z.string(),
    format: z.enum(['csv', 'json', 'xml']).optional(),
  }),
  z.object({
    type: z.literal(ConfigFieldType.CONDITION_LIST),
    id: z.string(),
    ops: z.array(FilterOpSchema),
  }),
  z.object({
    type: z.literal(ConfigFieldType.EXPRESSION),
    id: z.string(),
    placeholder: z.string().optional(),
  }),
]);

export type ConfigField = z.infer<typeof ConfigFieldSchema>;
