import type { Contract, DatasetContract } from '@training-ml/contracts';
import { PipelineArtifactType } from '@training-ml/contracts';

export function isDatasetContract(contract: Contract): contract is DatasetContract {
  return contract.artifact === PipelineArtifactType.DATASET;
}

export function getDatasetColumns(contract: Contract) {
  if (!isDatasetContract(contract)) return [];
  if (contract.schema.columns === 'unknown') return [];
  return contract.schema.columns;
}

export function getColumnByName(contract: Contract, name: string) {
  return getDatasetColumns(contract).find((col) => col.name === name);
}
