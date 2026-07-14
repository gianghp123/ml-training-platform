import 'server-only';

import { apiFetch } from '@/lib/api-fetch';
import type { BlockCategory, BlockDefinition } from '@training-ml/contracts';

export async function getBlockDefinitions(): Promise<BlockDefinition[]> {
  const response = await apiFetch<BlockDefinition[]>('/block-definitions', {
    query: { limit: 500 },
  });
  return response.data ?? [];
}

export async function getBlockCategories(): Promise<BlockCategory[]> {
  const response = await apiFetch<BlockCategory[]>('/block-categories', {
    query: { limit: 100 },
  });
  return response.data ?? [];
}
