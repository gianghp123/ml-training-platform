'use client';

import { createContext, useContext } from 'react';
import type { ValidationError, ValidationResult } from '@training-ml/contracts';

export interface ValidationContextValue {
  result: ValidationResult;
  getNodeErrors: (nodeId: string) => ValidationError[];
  isValid: boolean;
}

export const ValidationContext = createContext<ValidationContextValue | null>(null);

export function useValidationContext(): ValidationContextValue {
  const ctx = useContext(ValidationContext);
  if (!ctx) throw new Error('useValidationContext must be used within ValidationContext.Provider');
  return ctx;
}
