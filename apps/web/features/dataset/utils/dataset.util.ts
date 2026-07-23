import { DatasetFormat } from "@training-ml/contracts";


export const formatVariant: Record<DatasetFormat, "default" | "secondary" | "info" | "warning"> = {
  [DatasetFormat.CSV]: "default",
  [DatasetFormat.JSON]: "secondary",
  [DatasetFormat.XML]: "info",
}
