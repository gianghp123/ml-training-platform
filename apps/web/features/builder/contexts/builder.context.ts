'use client';

import type { Dataset } from '@training-ml/contracts';
import { createContext, useContext } from 'react';

export interface BuilderContextValue {
  datasets: Dataset[];
  onConfigChange: (
    nodeId: string,
    key: string,
    value: string | number | boolean
  ) => void;
}

export const BuilderContext = createContext<BuilderContextValue | null>(null);

export function useBuilderContext(): BuilderContextValue {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error('useBuilderContext must be used within BuilderContext.Provider');
  return ctx;
}
