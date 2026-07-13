import { WorkerStatus } from '../enums';

export interface Worker {
  id: string;
  hostname: string;
  status: WorkerStatus;
  lastHeartbeat?: Date;
  capability?: Record<string, unknown>;
}
