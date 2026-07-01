'use client';

import React, { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Panel,
  BackgroundVariant,
} from '@xyflow/react';

// Import CSS stylesheet of xyflow
import '@xyflow/react/dist/style.css';

const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { label: 'CSV Dataset Input' },
    position: { x: 250, y: 25 },
    className: 'bg-card text-card-foreground border-border rounded-xl shadow-md p-4 border font-medium text-xs w-48 transition-all hover:shadow-lg',
  },
  {
    id: '2',
    data: { label: 'Data Preprocessing (Min-Max Scaling)' },
    position: { x: 250, y: 125 },
    className: 'bg-card text-card-foreground border-border rounded-xl shadow-md p-4 border font-medium text-xs w-48 transition-all hover:shadow-lg',
  },
  {
    id: '3',
    data: { label: 'Model Training (Random Forest)' },
    position: { x: 250, y: 225 },
    className: 'bg-card text-card-foreground border-border rounded-xl shadow-md p-4 border font-medium text-xs w-48 transition-all hover:shadow-lg',
  },
  {
    id: '4',
    type: 'output',
    data: { label: 'Evaluation Metrics (MSE / R²)' },
    position: { x: 250, y: 325 },
    className: 'bg-card text-card-foreground border-border rounded-xl shadow-md p-4 border font-medium text-xs w-48 transition-all hover:shadow-lg',
  },
];

const initialEdges = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    animated: true,
    style: { stroke: 'var(--primary)' },
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    animated: true,
    style: { stroke: 'var(--primary)' },
  },
  {
    id: 'e3-4',
    source: '3',
    target: '4',
    style: { stroke: 'var(--primary)' },
  },
];

export function PipelineDesigner() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'var(--primary)' } }, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-[500px] border border-border rounded-xl overflow-hidden bg-background shadow-inner relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls className="fill-foreground stroke-foreground [&_button]:bg-card [&_button]:border-border [&_button]:hover:bg-accent" />
        <MiniMap
          nodeColor={() => 'var(--primary)'}
          maskColor="rgba(var(--background), 0.2)"
          className="bg-card border border-border rounded-lg"
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Panel position="top-left" className="bg-card text-card-foreground border border-border rounded-lg p-2 text-xs shadow-md font-medium">
          ML Pipeline Designer Demo (React Flow)
        </Panel>
      </ReactFlow>
    </div>
  );
}
