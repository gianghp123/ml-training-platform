// dataset.constants.ts
import { z } from "zod";

export const DatasetFormat = {
  CSV: "csv",
  JSON: "json",
  XML: "xml",
} as const;

export const DatasetFormatSchema = z.enum(
  Object.values(DatasetFormat) as [string, ...string[]],
);

export type DatasetFormat = z.infer<typeof DatasetFormatSchema>;

export const DatasetStatus = {
  UPLOADING: "uploading",
  VALIDATING: "validating",
  QUEUED: "queued",
  READY: "ready",
  FAILED: "failed",
} as const;

export const DatasetStatusSchema = z.enum(
  Object.values(DatasetStatus) as [string, ...string[]],
);

export type DatasetStatus = z.infer<typeof DatasetStatusSchema>;
