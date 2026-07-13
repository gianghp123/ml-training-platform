import { DatasetFormat } from "@/lib/enums";


export const formatVariant: Record<DatasetFormat, "default" | "secondary" | "info" | "warning"> = {
  [DatasetFormat.CSV]: "default",
  [DatasetFormat.JSON]: "secondary",
  [DatasetFormat.PARQUET]: "info",
  [DatasetFormat.AVRO]: "warning",
}
