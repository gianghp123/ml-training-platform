'use client';

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type EdgeTypes,
  type Node,
  type OnNodesDelete,
} from '@xyflow/react';
import { useCallback, useMemo, useState } from 'react';

import { useBlockPalette } from '../hooks/useBlockPalette';
import { useBuilder } from '../hooks/useBuilder';
import type { BlockCategory, BlockDefinition } from '@training-ml/contracts';

import BaseNode from './nodes/BaseNode';
import GroupNode from './nodes/GroupNode';

import { BlockPaletteContextMenu } from './BlockPaletteContextMenu';
import { WorkflowToolbar } from './WorkflowToolbar';

import { BuilderContext, type BuilderContextValue } from '../contexts/builder.context';
import { ValidationContext } from '../contexts/validation.context';

import { Card, CardContent } from '@/components/ui/card';
import { Pause, Play, Ungroup } from 'lucide-react';
import PipelineEdge from './edges/PipelineEdge';

const nodeTypes = {
  block: BaseNode,
  group: GroupNode,
};

const edgeTypes: EdgeTypes = {
  pipeline: PipelineEdge,
};

function isGroupNode(node: Node): boolean {
  return (node.data as Record<string, unknown>)._group === true;
}

interface GroupContextMenuState {
  groupId: string;
  position: { x: number; y: number };
}

interface BuilderCanvasProps {
  blocks: BlockDefinition[];
  categories: BlockCategory[];
}

export function BuilderCanvas({ blocks, categories }: BuilderCanvasProps) {
  const { validationResult, getNodeErrors, isValid, ...builder } = useBuilder({ blocks });
  const palette = useBlockPalette({ blocks, categories });
  const [groupContextMenu, setGroupContextMenu] = useState<GroupContextMenuState | null>(null);

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | globalThis.MouseEvent) => {
      event.preventDefault();
      builder.setPalettePosition({ x: event.clientX, y: event.clientY });
    },
    [builder]
  );

  const handlePaneClick = useCallback(() => {
    builder.setPalettePosition(null);
    setGroupContextMenu(null);
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

  const handleGroupSelection = useCallback(() => {
    builder.groupNodes(builder.groupableNodes);
    builder.setPalettePosition(null);
  }, [builder]);

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      if (isGroupNode(node)) {
        setGroupContextMenu({
          groupId: node.id,
          position: { x: event.clientX, y: event.clientY },
        });
      }
    },
    []
  );

  const handleOnNodesDelete: OnNodesDelete = useCallback(
    (deletedNodes) => {
      for (const node of deletedNodes) {
        if (isGroupNode(node)) {
          builder.ungroup(node.id);
        }
      }
      return true;
    },
    [builder]
  );

  const contextValue = useMemo<BuilderContextValue>(
    () => ({ onConfigChange: builder.updateNodeConfig }),
    [builder.updateNodeConfig]
  );

  const groupNode = useMemo(() => {
    if (!groupContextMenu) return undefined;
    return builder.nodes.find(
      (n) => n.id === groupContextMenu.groupId && isGroupNode(n)
    );
  }, [groupContextMenu, builder.nodes]);

  return (
    <ValidationContext.Provider value={{ result: validationResult, getNodeErrors, isValid }}>
    <div className="h-full w-full flex flex-col">
      <WorkflowToolbar
        workflowName={builder.workflowName}
        onWorkflowNameChange={builder.setWorkflowName}
        onSave={builder.saveWorkflow}
        onRun={() => { }}
        hasSavedWorkflow={builder.hasSavedWorkflow()}
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
            onNodeContextMenu={handleNodeContextMenu}
            onNodesDelete={handleOnNodesDelete}
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
            groupableCount={builder.groupableNodes.length}
            onGroupSelection={handleGroupSelection}
          />
        )}

        {groupContextMenu && groupNode && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setGroupContextMenu(null)} />
            <Card
              className="fixed z-50 w-44 shadow-lg"
              style={{
                left: groupContextMenu.position.x,
                top: groupContextMenu.position.y,
              }}
            >
              <CardContent className="p-1">
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-accent text-left"
                  onClick={() => {
                    builder.ungroup(groupContextMenu.groupId);
                    setGroupContextMenu(null);
                  }}
                >
                  <Ungroup className="size-3.5" />
                  Ungroup
                </button>
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-accent text-left"
                  onClick={() => {
                    builder.toggleSuspend(groupContextMenu.groupId);
                    setGroupContextMenu(null);
                  }}
                >
                  {groupNode.data.suspended ? (
                    <>
                      <Play className="size-3.5" />
                      Unskip
                    </>
                  ) : (
                    <>
                      <Pause className="size-3.5" />
                      Skip
                    </>
                  )}
                </button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
    </ValidationContext.Provider>
  );
}
