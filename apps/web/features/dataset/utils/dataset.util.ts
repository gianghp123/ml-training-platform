import { DatasetFormat, DatasetStatus } from "@training-ml/contracts"


export const formatVariant: Record<DatasetFormat, "default" | "secondary" | "info" | "warning"> = {
  [DatasetFormat.CSV]: "default",
  [DatasetFormat.JSON]: "secondary",
  [DatasetFormat.XML]: "info",
}

export const statusVariant: Record<DatasetStatus, "warning" | "info" | "success" | "destructive"> = {
  [DatasetStatus.UPLOADING]: "warning",
  [DatasetStatus.QUEUED]: "info",
  [DatasetStatus.VALIDATING]: "info",
  [DatasetStatus.READY]: "success",
  [DatasetStatus.FAILED]: "destructive",
}
