'use client';

import type { BlockDefinition, ValidationError } from '@training-ml/contracts';
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

const emptyResult: ValidationResult = { valid: true, errors: [], contracts: {} };

export function useValidation(
  nodes: Node[],
  edges: Edge[],
  blocks: BlockDefinition[]
): UseValidationReturn {

  const graph = useMemo(
    () => toValidationGraph(nodes, edges, blocks),
    [nodes, edges, blocks]
  );

  const stableGraph = useStableValue(graph, isGraphEqual);

  const result = useMemo(
    () => (nodes.length === 0 ? emptyResult : validateGraph(stableGraph, blocks)),
    [nodes.length, stableGraph, blocks]
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
