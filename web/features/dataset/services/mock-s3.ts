import type { S3Object } from "@/features/dataset/schema/dataset-files"

const FILE_TEMPLATES: Record<string, string[]> = {
  "customer-churn": [
    "train/data.csv",
    "train/labels.csv",
    "train/metadata.json",
    "test/data.csv",
    "test/labels.csv",
    "validation/data.csv",
    "validation/labels.csv",
    "schema.json",
    "README.md",
  ],
  "fraud-detection": [
    "transactions_train.csv",
    "transactions_test.csv",
    "fraud_labels_train.csv",
    "fraud_labels_test.csv",
    "feature_metadata.json",
    "data_dictionary.md",
  ],
  "imagenet-subset": [
    "train/n01440764/ILSVRC2012_val_00000293.JPEG",
    "train/n01440764/ILSVRC2012_val_00002138.JPEG",
    "train/n01443537/ILSVRC2012_val_00009897.JPEG",
    "train/n01484850/ILSVRC2012_val_00013513.JPEG",
    "train/n01491361/ILSVRC2012_val_00016909.JPEG",
    "val/n01440764/ILSVRC2012_val_00000146.JPEG",
    "val/n01443537/ILSVRC2012_val_00008552.JPEG",
    "val/n01484850/ILSVRC2012_val_00012345.JPEG",
    "labels.txt",
    "synsets.txt",
  ],
  "sentiment-corpus": [
    "train/pos/corpus_001.txt",
    "train/pos/corpus_002.txt",
    "train/neg/corpus_001.txt",
    "train/neg/corpus_002.txt",
    "test/pos/corpus_001.txt",
    "test/neg/corpus_001.txt",
    "vocab.json",
    "config.yaml",
  ],
}

const DEFAULT_FILE_TEMPLATES = [
  "train/data.parquet",
  "train/labels.parquet",
  "test/data.parquet",
  "test/labels.parquet",
  "README.md",
]

function getDatasetKey(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes("churn")) return "customer-churn"
  if (lower.includes("fraud")) return "fraud-detection"
  if (lower.includes("imagenet")) return "imagenet-subset"
  if (lower.includes("sentiment")) return "sentiment-corpus"
  return "default"
}

function generateFileSize(ext: string): number {
  switch (ext) {
    case "csv":
    case "tsv":
      return Math.round(Math.random() * 500_000_000) + 10_000_000
    case "parquet":
    case "avro":
      return Math.round(Math.random() * 200_000_000) + 5_000_000
    case "json":
    case "yaml":
    case "yml":
      return Math.round(Math.random() * 10_000_000) + 100_000
    case "md":
    case "txt":
      return Math.round(Math.random() * 50_000) + 1_000
    case "JPEG":
    case "jpg":
    case "png":
      return Math.round(Math.random() * 2_000_000) + 50_000
    default:
      return Math.round(Math.random() * 100_000_000) + 100_000
  }
}

function generateDate(baseMs: number, offset: number): string {
  return new Date(baseMs + offset * 86_400_000).toISOString()
}

export async function fetchDatasetFiles(
  storageUri: string
): Promise<S3Object[]> {
  await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 800))

  const parts = storageUri.replace("s3://", "").split("/")
  const bucket = parts[0]
  const prefix = parts.slice(1).join("/")

  const key = getDatasetKey(prefix)
  const template = FILE_TEMPLATES[key] ?? DEFAULT_FILE_TEMPLATES

  const baseDate = Date.now() - 90 * 86_400_000

  return template.map((filePath, index) => {
    const fullKey = `${bucket}/${prefix}/${filePath}`
    const ext = filePath.split(".").pop() ?? ""
    return {
      key: fullKey,
      size: generateFileSize(ext),
      lastModified: generateDate(baseDate, index * 3),
      etag: `"${Math.random().toString(36).slice(2, 18)}"`,
    }
  })
}
