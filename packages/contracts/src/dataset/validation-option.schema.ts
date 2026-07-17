import { z } from 'zod';
import { Column } from './column.schema';
import { PrimitiveType, PrimitiveTypeSchema, SemanticType, SemanticTypeSchema } from './primitive.schema';

export const ColumnOverrideSchema = z.object({
  name: z.string(),
  primitive: PrimitiveTypeSchema.optional(),
  semantic: SemanticTypeSchema.optional(),
});
export type ColumnOverride = z.infer<typeof ColumnOverrideSchema>;

export const CsvValidationOptionsSchema = z.object({
  delimiter: z.string().length(1).optional(),
  hasHeader: z.boolean().optional(),
  encoding: z.string().optional(),
});

export const JsonValidationOptionsSchema = z.object({
  recordsPath: z.string().optional(), // dot-path to nested array, e.g. "data.items"
});

export const XmlValidationOptionsSchema = z.object({
  recordElement: z.string().optional(),
});

export const ValidationOptionsSchema = z.object({
  csv: CsvValidationOptionsSchema.optional(),
  json: JsonValidationOptionsSchema.optional(),
  xml: XmlValidationOptionsSchema.optional(),

  sampleSize: z.number().int().positive().max(10_000).optional(),
  requiredColumns: z.array(z.string()).optional(),
  columnOverrides: z.array(ColumnOverrideSchema).optional(),
  maxFileSizeBytes: z.number().int().positive().optional(),
});
export type ValidationOptions = z.infer<typeof ValidationOptionsSchema>;


const INT_REGEX = /^-?\d+$/;
const FLOAT_REGEX = /^-?\d+\.\d+$/;
const BOOLEAN_VALUES = new Set(['true', 'false']);
const DATETIME_REGEX =
  /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export function inferPrimitiveType(values: unknown[]): PrimitiveType {
  let sawFloat = false;
  let sawInt = false;
  let sawBool = false;
  let sawOther = false;

  for (const raw of values) {
    if (raw === null || raw === undefined || raw === '') continue;

    if (typeof raw === 'boolean') {
      sawBool = true;
      continue;
    }
    if (typeof raw === 'number') {
      Number.isInteger(raw) ? (sawInt = true) : (sawFloat = true);
      continue;
    }

    const str = String(raw).trim();
    if (BOOLEAN_VALUES.has(str.toLowerCase())) {
      sawBool = true;
    } else if (INT_REGEX.test(str)) {
      sawInt = true;
    } else if (FLOAT_REGEX.test(str)) {
      sawFloat = true;
    } else {
      sawOther = true;
    }
  }

  if (sawOther) return 'string';
  if (sawFloat) return 'float';
  if (sawInt) return 'int';
  if (sawBool) return 'boolean';
  return 'string';
}

export function inferSemanticType(
  values: unknown[],
  primitive: PrimitiveType,
): SemanticType {
  const nonEmpty = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (nonEmpty.length === 0) return 'text';

  if (primitive === 'int' || primitive === 'float') return 'numeric';

  const asStrings = nonEmpty.map((v) => String(v).trim());
  if (asStrings.every((v) => DATETIME_REGEX.test(v))) return 'datetime';

  const distinctRatio = new Set(asStrings).size / asStrings.length;
  const avgLength = asStrings.reduce((sum, v) => sum + v.length, 0) / asStrings.length;

  if (distinctRatio <= 0.5 && avgLength <= 40) return 'categorical';
  return 'text';
}

export function isNullable(values: unknown[]): boolean {
  return values.some((v) => v === null || v === undefined || v === '');
}

export function inferColumns(
  records: Record<string, unknown>[],
  sampleSize = 500,
  overrides: ColumnOverride[] = [],
): Column[] {
  if (records.length === 0) return [];

  const overrideMap = new Map(overrides.map((o) => [o.name, o]));
  const sample = records.slice(0, sampleSize);
  const keys = new Set<string>();
  for (const record of sample) {
    Object.keys(record).forEach((k) => keys.add(k));
  }

  return Array.from(keys).map((key) => {
    const values = sample.map((r) => r[key]);
    const override = overrideMap.get(key);

    const primitive = override?.primitive ?? inferPrimitiveType(values);
    const semantic = override?.semantic ?? inferSemanticType(values, primitive);

    return {
      name: key,
      primitive,
      semantic,
      nullable: isNullable(values),
    };
  });
}
