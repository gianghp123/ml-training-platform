'use client';

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type EdgeTypes,
} from '@xyflow/react';
import { useCallback, useMemo } from 'react';

import { useBlockPalette } from '../hooks/useBlockPalette';
import { useBuilder } from '../hooks/useBuilder';

import BaseNode from './nodes/BaseNode';

import { BlockPaletteContextMenu } from './BlockPaletteContextMenu';
import { WorkflowToolbar } from './WorkflowToolbar';

import { BuilderContext, type BuilderContextValue } from '../contexts/builder.context';

import PipelineEdge from './edges/PipelineEdge';

const nodeTypes = {
  block: BaseNode,
};

const edgeTypes: EdgeTypes = {
  pipeline: PipelineEdge,
};


export function BuilderCanvas() {
  const builder = useBuilder();
  const palette = useBlockPalette();

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | globalThis.MouseEvent) => {
      event.preventDefault();
      builder.setPalettePosition({ x: event.clientX, y: event.clientY });
    },
    [builder]
  );

  const handlePaneClick = useCallback(() => {
    builder.setPalettePosition(null);
  }, [builder]);

  const handleSelectBlock = useCallback(
    (blockId: string) => {
      const pos = builder.palettePosition;
      if (pos) {
        builder.addNode(blockId, pos);
        builder.setPalettePosition(null);
      }
    },
    [builder]
  );

  const contextValue = useMemo<BuilderContextValue>(
    () => ({ onConfigChange: builder.updateNodeConfig }),
    [builder.updateNodeConfig]
  );

  return (
    <div className="h-full w-full flex flex-col">
      <WorkflowToolbar
        workflowName={builder.workflowName}
        onWorkflowNameChange={builder.setWorkflowName}
        onSave={builder.saveWorkflow}
        onRun={() => { }}
        hasSavedWorkflow={builder.hasSavedWorkflow}
        onLoad={builder.loadWorkflow}
        edgeStyle={builder.edgeStyle}
        onEdgeStyleChange={builder.setEdgeStyle}
      />
      <div className="flex-1 relative">
        <BuilderContext.Provider value={contextValue}>
          <ReactFlow
            nodes={builder.nodes}
            edges={builder.edges}
            onNodesChange={builder.onNodesChange}
            onEdgesChange={builder.onEdgesChange}
            onConnect={builder.onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionLineStyle={{ stroke: '#6b7280', strokeWidth: 6 }}
            colorMode="dark"
            fitView
            onPaneClick={handlePaneClick}
            onPaneContextMenu={handlePaneContextMenu}
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              pannable
              zoomable
              className="bg-background/80!"
            />
          </ReactFlow>
        </BuilderContext.Provider>

        {builder.palettePosition && (
          <BlockPaletteContextMenu
            key={`${builder.palettePosition.x}-${builder.palettePosition.y}`}
            position={builder.palettePosition}
            searchQuery={palette.searchQuery}
            onSearchChange={palette.setSearchQuery}
            blocksByCategory={palette.blocksByCategory}
            onSelectBlock={handleSelectBlock}
            onClose={() => builder.setPalettePosition(null)}
          />
        )}
      </div>
    </div>
  );
}
