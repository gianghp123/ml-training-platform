import 'server-only';

import { apiFetch } from '@/lib/api-fetch';
import type { BlockCategory, BlockDefinition } from '@training-ml/contracts';

export async function getBlockDefinitions() {
  return apiFetch<BlockDefinition[]>('/block-definitions', {
    query: { limit: 500 },
  });
}

export async function getBlockCategories() {
  return apiFetch<BlockCategory[]>('/block-categories', {
    query: { limit: 100 },
  });
}
