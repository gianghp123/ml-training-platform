import { DatasetFormat } from '../enums';

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  storageUri: string;
  format: DatasetFormat;
  size: number;
  checksum?: string;
  version: number;
  userId: string;
}
