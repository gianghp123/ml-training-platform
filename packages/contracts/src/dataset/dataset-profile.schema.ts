import z from "zod";
import { ColumnSchema } from "./column.schema";
import { DatasetFormat } from "./dataset.constants";

const ProfileMetaSchema = z.object({
  sampled: z.boolean().optional(),        // true if columns/schema came from a partial sample
  sampledRows: z.number().optional(),     // how many rows/records were actually inspected
  warnings: z.array(z.string()).optional(), // non-fatal issues: unmatched overrides, mixed types, etc.
});

export const CsvProfileSchema = z.object({
  format: z.literal(DatasetFormat.CSV),
  delimiter: z.string(),
  hasHeader: z.boolean(),
  encoding: z.string(),
  rowCount: z.number(),
  columns: z.array(ColumnSchema),
}).extend(ProfileMetaSchema.shape);

export const JsonProfileSchema = z.object({
  format: z.literal(DatasetFormat.JSON),
  rootType: z.enum(["array", "object"]),
  recordCount: z.number().optional(),
  schema: z.union([
    z.array(ColumnSchema),
    z.literal("unknown"),
  ]),
}).extend(ProfileMetaSchema.shape);

export const XmlProfileSchema = z.object({
  format: z.literal(DatasetFormat.XML),
  rootElement: z.string(),
  recordElement: z.string().optional(),
  recordCount: z.number().optional(),
  schema: z.union([
    z.array(ColumnSchema),
    z.literal("unknown"),
  ]),
}).extend(ProfileMetaSchema.shape);

export const DatasetProfileSchema = z.discriminatedUnion("format", [
  CsvProfileSchema,
  JsonProfileSchema,
  XmlProfileSchema,
]);
export type DatasetProfile = z.infer<typeof DatasetProfileSchema>;
