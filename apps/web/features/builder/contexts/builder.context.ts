"use client"

import type { BlockDefinition, Dataset } from "@training-ml/contracts"
import { createContext, useContext } from "react"

export interface BuilderContextValue {
  blocks: BlockDefinition[]
  datasets: Dataset[]
  isLocked: boolean
  onConfigChange: (nodeId: string, key: string, value: unknown) => void
}

export const BuilderContext = createContext<BuilderContextValue | null>(null)

export function useBuilderContext(): BuilderContextValue {
  const ctx = useContext(BuilderContext)
  if (!ctx)
    throw new Error(
      "useBuilderContext must be used within BuilderContext.Provider"
    )
  return ctx
}
