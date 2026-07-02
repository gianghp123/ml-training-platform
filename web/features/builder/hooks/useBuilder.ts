'use client';

import {
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type XYPosition,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

const GROUP_PADDING = 20;
const GROUP_HEADER_HEIGHT = 36;

function isGroupNode(node: Node): boolean {
  return (node.data as Record<string, unknown>)._group === true;
}

function buildEdgeData(sourceNodeId: string, nodes: Node[], edgeStyle: EdgeStyle) {
  const node = nodes.find((n) => n.id === sourceNodeId);
  const categoryId =
    node && node.type === 'block'
      ? (node as PipelineNode).data.categoryId
      : undefined;
  return {
    color: categoryId ? CATEGORY_EDGE_COLORS[categoryId] ?? '#6b7280' : '#6b7280',
    edgeStyle,
  };
}

interface UseBuilderReturn {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node>;
  onEdgesChange: OnEdgesChange<Edge>;
  onConnect: OnConnect;
  addNode: (blockId: string, position: XYPosition) => PipelineNode | null;
  removeNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  updateNodeConfig: (nodeId: string, key: string, value: string | number | boolean) => void;
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
  groupableNodes: string[];
  groupNodes: (nodeIds: string[]) => void;
  ungroup: (groupId: string) => void;
  toggleSuspend: (groupId: string) => void;
}

export function useBuilder(): UseBuilderReturn {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
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

  const pipelineNodes = useMemo(
    () => nodes.filter((n) => n.type === 'block') as PipelineNode[],
    [nodes]
  );

  const groupableNodes = useMemo(
    () => nodes.filter((n) => n.selected && n.type === 'block').map((n) => n.id),
    [nodes]
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (
        !isValidNodeConnection({
          sourceNodeId: connection.source,
          targetNodeId: connection.target,
          sourceHandle: connection.sourceHandle ?? null,
          targetHandle: connection.targetHandle ?? null,
          nodes: pipelineNodes.map((n) => ({ id: n.id, data: n.data, type: n.type ?? 'block' })),
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
    [nodes, pipelineNodes, edges, edgeStyle, setEdges]
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
      setNodes((nds) => {
        const node = nds.find((n) => n.id === nodeId);
        if (node && isGroupNode(node)) {
          const childIds = nds.filter((n) => n.parentId === nodeId).map((n) => n.id);
          return ungroupInternal(nodeId, childIds, nds);
        }
        return nds.filter((n) => n.id !== nodeId);
      });
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [setNodes, setEdges, selectedNodeId]
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.type !== 'block') return;
      const block = findBlockById((node as PipelineNode).data.blockId);
      if (!block) return;
      addNode(block.id, { x: node.position.x + 50, y: node.position.y + 50 });
    },
    [nodes, addNode]
  );

  const updateNodeConfig = useCallback(
    (nodeId: string, key: string, value: string | number | boolean) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId || n.type !== 'block') return n;
          const pn = n as PipelineNode;
          return { ...pn, data: { ...pn.data, config: { ...pn.data.config, [key]: value } } } as Node;
        })
      );
    },
    [setNodes]
  );

  const groupNodes = useCallback(
    (nodeIds: string[]) => {
      setNodes((nds) => createGroups(nds, nodeIds));
    },
    [setNodes]
  );

  const ungroup = useCallback(
    (groupId: string) => {
      setNodes((nds) => ungroupSingle(groupId, nds));
      setEdges((eds) =>
        eds.map((e) => {
          const ed = e.data as Record<string, unknown>;
          if (ed.suspended === undefined) return e;
          return { ...e, data: { ...ed, suspended: false } };
        })
      );
    },
    [setNodes, setEdges]
  );

  const toggleSuspend = useCallback(
    (groupId: string) => {
      let nextState = false;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== groupId || !isGroupNode(n)) return n;
          nextState = !(n.data as Record<string, unknown>).suspended;
          return { ...n, data: { ...n.data, suspended: nextState } };
        })
      );
      setEdges((eds) => {
        const childIds = nodes.filter((n) => n.parentId === groupId).map((n) => n.id);
        return eds.map((e) => {
          if (!childIds.includes(e.source) && !childIds.includes(e.target)) return e;
          return { ...e, data: { ...(e.data as Record<string, unknown>), suspended: nextState } };
        });
      });
    },
    [nodes, setNodes, setEdges]
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
    groupableNodes,
    groupNodes,
    ungroup,
    toggleSuspend,
  };
}

function ungroupInternal(groupId: string, childIds: string[], nds: Node[]): Node[] {
  const parent = nds.find((n) => n.id === groupId && isGroupNode(n));
  if (!parent) return nds;
  return nds
    .map((n) => {
      if (!childIds.includes(n.id)) return n;
      return {
        ...n,
        position: { x: n.position.x + parent.position.x, y: n.position.y + parent.position.y },
        parentId: undefined,
      };
    })
    .filter((n) => n.id !== groupId);
}

function ungroupSingle(groupId: string, nds: Node[]): Node[] {
  const parent = nds.find((n) => n.id === groupId && isGroupNode(n));
  if (!parent) return nds;
  const childIds = nds.filter((n) => n.parentId === groupId).map((n) => n.id);
  return ungroupInternal(groupId, childIds, nds);
}

function createGroups(nds: Node[], nodeIds: string[]): Node[] {
  const targets = nds.filter((n) => nodeIds.includes(n.id) && n.type === 'block');
  if (targets.length < 2) return nds;

  const minX = Math.min(...targets.map((n) => n.position.x));
  const minY = Math.min(...targets.map((n) => n.position.y));
  const maxX = Math.max(...targets.map((n) => n.position.x + (n.width ?? 200)));
  const maxY = Math.max(...targets.map((n) => n.position.y + (n.height ?? 100)));

  const groupWidth = maxX - minX + GROUP_PADDING * 2;
  const groupHeight = maxY - minY + GROUP_HEADER_HEIGHT + GROUP_PADDING * 4;
  const groupX = minX - GROUP_PADDING;
  const groupY = minY - GROUP_HEADER_HEIGHT - GROUP_PADDING;

  const groupId = `group_${Date.now()}`;

  const groupNode: Node = {
    id: groupId,
    type: 'group',
    position: { x: groupX, y: groupY },
    data: { _group: true, label: 'Group', suspended: false },
    width: groupWidth,
    height: groupHeight,
    style: { backgroundColor: 'rgba(100, 100, 255, 0.08)', border: '2px dashed rgba(100, 100, 255, 0.3)' },
  };

  const children = nds.map((n) => {
    if (!nodeIds.includes(n.id)) return n;
    return {
      ...n,
      position: { x: n.position.x - groupX, y: n.position.y - groupY },
      parentId: groupId,
      extent: 'parent' as const,
    };
  });

  return [groupNode, ...children];
}
