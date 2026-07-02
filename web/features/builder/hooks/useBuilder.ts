'use client';

import {
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type XYPosition,
} from '@xyflow/react';
import { useCallback, useEffect, useState } from 'react';
import { createPipelineNode, findBlockById, type PipelineNode } from '../utils/node-factory';
import { isValidNodeConnection } from '../utils/socket-validator';
import { useWorkflowPersistence } from './useWorkflowPersistence';

type EdgeStyle = 'smoothstep' | 'bezier' | 'straight';

const CATEGORY_EDGE_COLORS: Record<string, string> = {
  data: '#3b82f6',
  transform: '#f59e0b',
  model: '#22c55e',
  evaluate: '#a855f7',
  export: '#f43f5e',
};

function buildEdgeData(sourceNodeId: string, nodes: PipelineNode[], edgeStyle: EdgeStyle) {
  const node = nodes.find((n) => n.id === sourceNodeId);
  return {
    color: node ? CATEGORY_EDGE_COLORS[node.data.categoryId] ?? '#6b7280' : '#6b7280',
    edgeStyle,
  };
}

interface UseBuilderReturn {
  nodes: PipelineNode[];
  edges: ReturnType<typeof useEdgesState<Edge>>[0];
  onNodesChange: OnNodesChange<PipelineNode>;
  onEdgesChange: OnEdgesChange<Edge>;
  onConnect: OnConnect;
  addNode: (blockId: string, position: XYPosition) => PipelineNode | null;
  removeNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  updateNodeConfig: (
    nodeId: string,
    key: string,
    value: string | number | boolean
  ) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  workflowName: string;
  setWorkflowName: (name: string) => void;
  saveWorkflow: () => void;
  loadWorkflow: () => boolean;
  hasSavedWorkflow: boolean;
  palettePosition: XYPosition | null;
  setPalettePosition: (pos: XYPosition | null) => void;
  edgeStyle: EdgeStyle;
  setEdgeStyle: (style: EdgeStyle) => void;
}

export function useBuilder(): UseBuilderReturn {
  const [nodes, setNodes, onNodesChange] = useNodesState<PipelineNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [palettePosition, setPalettePosition] = useState<XYPosition | null>(null);
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>('smoothstep');

  const { saveWorkflow: persist, loadWorkflow: load, hasSavedWorkflow: hasSavedCheck } =
    useWorkflowPersistence();

  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        data: { ...(e.data as Record<string, unknown>), edgeStyle },
      }))
    );
  }, [edgeStyle, setEdges]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (
        !isValidNodeConnection({
          sourceNodeId: connection.source,
          targetNodeId: connection.target,
          sourceHandle: connection.sourceHandle ?? null,
          targetHandle: connection.targetHandle ?? null,
          nodes: nodes.map((n) => ({
            id: n.id,
            data: n.data,
            type: n.type ?? 'data',
          })),
          edges,
        })
      ) {
        return;
      }
      setEdges((eds) =>
        addEdge(
          { ...connection, type: 'pipeline', data: buildEdgeData(connection.source, nodes, edgeStyle) },
          eds,
        )
      );
    },
    [nodes, edges, edgeStyle, setEdges]
  );

  const addNode = useCallback(
    (blockId: string, position: XYPosition): PipelineNode | null => {
      const block = findBlockById(blockId);
      if (!block) return null;
      const node = createPipelineNode(block, position);
      setNodes((nds) => [...nds, node]);
      return node;
    },
    [setNodes]
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [setNodes, setEdges, selectedNodeId]
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const block = findBlockById(node.data.blockId);
      if (!block) return;
      addNode(block.id, {
        x: node.position.x + 50,
        y: node.position.y + 50,
      });
    },
    [nodes, addNode]
  );

  const updateNodeConfig = useCallback(
    (nodeId: string, key: string, value: string | number | boolean) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          return {
            ...n,
            data: { ...n.data, config: { ...n.data.config, [key]: value } },
          };
        })
      );
    },
    [setNodes]
  );

  const saveWorkflow = useCallback(() => {
    persist(workflowName, nodes, edges);
  }, [workflowName, nodes, edges, persist]);

  const loadWorkflowFn = useCallback((): boolean => {
    const data = load();
    if (!data) return false;
    setNodes(data.nodes);
    setEdges(data.edges);
    setWorkflowName(data.name);
    return true;
  }, [load, setNodes, setEdges]);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    removeNode,
    duplicateNode,
    updateNodeConfig,
    selectedNodeId,
    setSelectedNodeId,
    workflowName,
    setWorkflowName,
    saveWorkflow,
    loadWorkflow: loadWorkflowFn,
    hasSavedWorkflow: hasSavedCheck(),
    palettePosition,
    setPalettePosition,
    edgeStyle,
    setEdgeStyle,
  };
}
