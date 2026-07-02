'use client';

import { useCallback } from 'react';
import type { Edge } from '@xyflow/react';
import type { PipelineNode } from '../utils/node-factory';
import { serializeGraph, deserializeGraph, type SerializedGraph } from '../utils/graph-serializer';

const STORAGE_KEY = 'pipeline-builder-workflow';

function createEdge(
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string,
  edgeData?: Record<string, unknown>,
): Edge {
  return {
    id: `${source}-${sourceHandle}-${target}-${targetHandle}`,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: 'pipeline',
    data: edgeData,
  };
}

interface UseWorkflowPersistenceReturn {
  saveWorkflow: (name: string, nodes: PipelineNode[], edges: Edge[]) => void;
  loadWorkflow: () => {
    name: string;
    nodes: PipelineNode[];
    edges: Edge[];
  } | null;
  hasSavedWorkflow: () => boolean;
}

export function useWorkflowPersistence(): UseWorkflowPersistenceReturn {
  const saveWorkflow = useCallback(
    (name: string, nodes: PipelineNode[], edges: Edge[]) => {
      const graph = serializeGraph(nodes, edges);
      const data = { name, graph, savedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },
    []
  );

  const loadWorkflow = useCallback(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw) as {
        name: string;
        graph: SerializedGraph;
        savedAt: string;
      };
      const { nodes, edges } = deserializeGraph(data.graph, createEdge);
      return { name: data.name, nodes, edges };
    } catch {
      return null;
    }
  }, []);

  const hasSavedWorkflow = useCallback(() => {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }, []);

  return { saveWorkflow, loadWorkflow, hasSavedWorkflow };
}
