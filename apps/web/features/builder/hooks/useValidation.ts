'use client';

import type { BlockDefinition, Column, Dataset, ValidationError } from '@training-ml/contracts';
import { validateGraph, type ValidationResult } from '@training-ml/pipeline-engine';
import type { Edge, Node } from '@xyflow/react';
import { useCallback, useMemo } from 'react';
import { isGraphEqual } from '../utils/graph-equality';
import { toValidationGraph } from '../utils/graph-transform';
import { useStableValue } from './useStableValue';

interface UseValidationReturn {
  result: ValidationResult;
  getNodeErrors: (nodeId: string) => ValidationError[];
  isValid: boolean;
}

const emptyResult: ValidationResult = { valid: true, errors: [], contracts: {}, inputContracts: {} };

export function useValidation(
  nodes: Node[],
  edges: Edge[],
  blocks: BlockDefinition[],
  datasets: Dataset[] = [],
): UseValidationReturn {

  const resolveColumns = useCallback(
    (datasetId: string): Column[] | null => {
      const dataset = datasets.find((d) => d.id === datasetId);
      if (!dataset?.profile) return null;
      const profile = dataset.profile;
      if (profile.format === 'csv') return profile.columns;
      if (Array.isArray(profile.schema)) return profile.schema;
      return null;
    },
    [datasets],
  );

  const graph = useMemo(
    () => toValidationGraph(nodes, edges, blocks),
    [nodes, edges, blocks]
  );

  const stableGraph = useStableValue(graph, isGraphEqual);

  const result = useMemo(
    () => (nodes.length === 0 ? emptyResult : validateGraph(stableGraph, blocks, resolveColumns)),
    [nodes.length, stableGraph, blocks, resolveColumns]
  );

  const errorsByNode = useMemo(() => {
    const map = new Map<string, ValidationError[]>();
    for (const error of result.errors) {
      const existing = map.get(error.nodeId) ?? [];
      existing.push(error);
      map.set(error.nodeId, existing);
    }
    return map;
  }, [result.errors]);

  const getNodeErrors = useCallback(
    (nodeId: string) => errorsByNode.get(nodeId) ?? [],
    [errorsByNode]
  );

  return {
    result,
    getNodeErrors,
    isValid: result.valid,
  };
}
