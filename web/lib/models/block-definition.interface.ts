export interface BlockDefinition {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  description?: string;
  configSchema?: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  dockerImage?: string;
  version?: string;
}
