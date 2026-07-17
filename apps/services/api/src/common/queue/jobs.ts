export enum TrainingJob {
  PREPROCESS = "preprocess",
  TRAIN = "train",
  EVALUATE = "evaluate",
  EXPORT = "export",
}

export enum DatasetUploadJob {
  VALIDATE_DATASET = "validate-dataset",
}

export interface DatasetUploadJobPayload {
  datasetId: string;
}
