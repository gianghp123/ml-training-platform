"use client"

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type EdgeTypes,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
  type OnNodesDelete,
  type ReactFlowInstance,
} from "@xyflow/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type {
  BlockCategory,
  BlockDefinition,
  Dataset,
} from "@training-ml/contracts"
import { useBlockPalette } from "../hooks/useBlockPalette"
import { useBuilder } from "../hooks/useBuilder"

import BaseNode from "./nodes/BaseNode"
import GroupNode from "./nodes/GroupNode"

import { BlockPaletteContextMenu } from "./BlockPaletteContextMenu"
import { WorkflowToolbar } from "./WorkflowToolbar"
import { PipelineRunPanel } from "./PipelineRunPanel"

import {
  BuilderContext,
  type BuilderContextValue,
} from "../contexts/builder.context"
import { ValidationContext } from "../contexts/validation.context"
import { toValidationGraph } from "../utils/graph-transform"

import { Card, CardContent } from "@/components/ui/card"
import { Pause, Play, Ungroup } from "lucide-react"
import PipelineEdge from "./edges/PipelineEdge"
import { usePipelineRun } from "../hooks/usePipelineRun"
import { getReadyCsvDatasets } from "../utils/iris-demo"
import { DEMOS, getDemo, getDefaultDemo } from "../utils/demos"
import { toast } from "sonner"

const nodeTypes = {
  block: BaseNode,
  group: GroupNode,
}

const edgeTypes: EdgeTypes = {
  pipeline: PipelineEdge,
}

function isGroupNode(node: Node): boolean {
  return (node.data as Record<string, unknown>)._group === true
}

interface GroupContextMenuState {
  groupId: string
  position: { x: number; y: number }
}

interface BuilderCanvasProps {
  blocks: BlockDefinition[]
  categories: BlockCategory[]
  datasets: Dataset[]
}

export function BuilderCanvas({
  blocks,
  categories,
  datasets,
}: BuilderCanvasProps) {
  const {
    validationResult,
    getNodeErrors,
    isValid,
    setNodeRunStatuses,
    ...builder
  } = useBuilder({ blocks, datasets })
  const pipelineRun = usePipelineRun()
  const reactFlowRef = useRef<ReactFlowInstance<Node> | null>(null)
  const palette = useBlockPalette({ blocks, categories })
  const [groupContextMenu, setGroupContextMenu] =
    useState<GroupContextMenuState | null>(null)
  const readyCsvDatasets = useMemo(
    () => getReadyCsvDatasets(datasets),
    [datasets]
  )
  const [demoDatasetId, setDemoDatasetId] = useState(
    () => readyCsvDatasets[0]?.id ?? ""
  )
  const activeDemoDatasetId = readyCsvDatasets.some(
    (dataset) => dataset.id === demoDatasetId
  )
    ? demoDatasetId
    : (readyCsvDatasets[0]?.id ?? "")

  const [demoId, setDemoId] = useState(() => getDefaultDemo().id)
  const activeDemoId = DEMOS.some((demo) => demo.id === demoId)
    ? demoId
    : getDefaultDemo().id

  useEffect(() => {
    setNodeRunStatuses(pipelineRun.state.nodeStatuses)
  }, [setNodeRunStatuses, pipelineRun.state.nodeStatuses])

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | globalThis.MouseEvent) => {
      event.preventDefault()
      if (pipelineRun.isActive) return
      builder.setPalettePosition({ x: event.clientX, y: event.clientY })
    },
    [builder, pipelineRun.isActive]
  )

  const handlePaneClick = useCallback(() => {
    builder.setPalettePosition(null)
    setGroupContextMenu(null)
  }, [builder])

  const handleSelectBlock = useCallback(
    (blockId: string) => {
      if (pipelineRun.isActive) return
      const pos = builder.palettePosition
      if (pos) {
        builder.addNode(blockId, pos)
        builder.setPalettePosition(null)
      }
    },
    [builder, pipelineRun.isActive]
  )

  const handleGroupSelection = useCallback(() => {
    if (pipelineRun.isActive) return
    builder.groupNodes(builder.groupableNodes)
    builder.setPalettePosition(null)
  }, [builder, pipelineRun.isActive])

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      if (pipelineRun.isActive) return
      if (isGroupNode(node)) {
        setGroupContextMenu({
          groupId: node.id,
          position: { x: event.clientX, y: event.clientY },
        })
      }
    },
    [pipelineRun.isActive]
  )

  const handleOnNodesDelete: OnNodesDelete = useCallback(
    (deletedNodes) => {
      if (pipelineRun.isActive) return false
      for (const node of deletedNodes) {
        if (isGroupNode(node)) {
          builder.ungroup(node.id)
        }
      }
      return true
    },
    [builder, pipelineRun.isActive]
  )

  const contextValue = useMemo<BuilderContextValue>(
    () => ({
      blocks,
      datasets,
      isLocked: pipelineRun.isActive,
      onConfigChange: builder.updateNodeConfig,
    }),
    [blocks, datasets, pipelineRun.isActive, builder.updateNodeConfig]
  )

  const groupNode = useMemo(() => {
    if (!groupContextMenu) return undefined
    return builder.nodes.find(
      (n) => n.id === groupContextMenu.groupId && isGroupNode(n)
    )
  }, [groupContextMenu, builder.nodes])

  const handleNodesChange: OnNodesChange<Node> = useCallback(
    (changes) => {
      const allowed = pipelineRun.isActive
        ? changes.filter(
            (change) => change.type === "select" || change.type === "dimensions"
          )
        : changes
      if (allowed.length > 0) builder.onNodesChange(allowed)
    },
    [builder, pipelineRun.isActive]
  )

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const allowed = pipelineRun.isActive
        ? changes.filter((change) => change.type === "select")
        : changes
      if (allowed.length > 0) builder.onEdgesChange(allowed)
    },
    [builder, pipelineRun.isActive]
  )

  const handleRun = async () => {
    if (!isValid || pipelineRun.isActive) return
    const graph = toValidationGraph(builder.nodes, builder.edges)
    try {
      const accepted = await pipelineRun.execute(graph)
      toast.success(`Pipeline run ${accepted.runId.slice(0, 8)} queued.`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start pipeline run."
      )
    }
  }

  const handleLoadDemo = (targetDemoId?: string) => {
    if (pipelineRun.isActive) return
    const demoIdToLoad = targetDemoId || activeDemoId
    if (targetDemoId && targetDemoId !== activeDemoId) {
      setDemoId(targetDemoId)
    }
    const demo = getDemo(demoIdToLoad) ?? getDefaultDemo()
    const dataset = readyCsvDatasets.find(
      (candidate) => candidate.id === activeDemoDatasetId
    )
    if (!dataset) {
      toast.error(`Select a READY CSV dataset before loading the ${demo.name} demo.`)
      return
    }

    try {
      const graph = demo.create(blocks, dataset.id)
      pipelineRun.reset()
      builder.replaceGraph(graph.nodes, graph.edges)
      builder.setWorkflowName(demo.workflowName)
      window.requestAnimationFrame(() => {
        void reactFlowRef.current?.fitView({ padding: 0.15, duration: 400 })
      })
      toast.success(`${demo.name} graph loaded. Review validation, then click Run.`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Unable to load ${demo.name} demo.`
      )
    }
  }

  return (
    <ValidationContext.Provider
      value={{
        result: validationResult,
        contracts: validationResult.contracts,
        inputContracts: validationResult.inputContracts,
        getNodeErrors,
        isValid,
      }}
    >
      <div className="flex h-full w-full flex-col">
        <WorkflowToolbar
          workflowName={builder.workflowName}
          onWorkflowNameChange={builder.setWorkflowName}
          onSave={builder.saveWorkflow}
          onRun={handleRun}
          hasSavedWorkflow={builder.hasSavedWorkflow()}
          onLoad={builder.loadWorkflow}
          edgeStyle={builder.edgeStyle}
          onEdgeStyleChange={builder.setEdgeStyle}
          isRunning={pipelineRun.isActive}
          readyCsvDatasets={readyCsvDatasets}
          demoDatasetId={activeDemoDatasetId}
          onDemoDatasetChange={setDemoDatasetId}
          demoId={activeDemoId}
          onDemoIdChange={setDemoId}
          demos={DEMOS}
          onLoadDemo={handleLoadDemo}
        />
        <div className="flex min-h-0 flex-1">
          <div className="relative min-w-0 flex-1">
            <BuilderContext.Provider value={contextValue}>
              <ReactFlow
                nodes={builder.nodes}
                edges={builder.edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={pipelineRun.isActive ? undefined : builder.onConnect}
                nodesDraggable={!pipelineRun.isActive}
                nodesConnectable={!pipelineRun.isActive}
                deleteKeyCode={
                  pipelineRun.isActive ? null : ["Backspace", "Delete"]
                }
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionLineStyle={{ stroke: "#6b7280", strokeWidth: 6 }}
                colorMode="dark"
                fitView
                onInit={(instance) => {
                  reactFlowRef.current = instance
                }}
                onPaneClick={handlePaneClick}
                onPaneContextMenu={handlePaneContextMenu}
                onNodeContextMenu={handleNodeContextMenu}
                onNodesDelete={handleOnNodesDelete}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={12}
                  size={1}
                />
                <Controls />
                <MiniMap
                  nodeStrokeWidth={3}
                  pannable
                  zoomable
                  className="bg-background/80!"
                />
              </ReactFlow>
            </BuilderContext.Provider>

            {builder.palettePosition && !pipelineRun.isActive && (
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

            {groupContextMenu && groupNode && !pipelineRun.isActive && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setGroupContextMenu(null)}
                />
                <Card
                  className="fixed z-50 w-44 shadow-lg"
                  style={{
                    left: groupContextMenu.position.x,
                    top: groupContextMenu.position.y,
                  }}
                >
                  <CardContent className="p-1">
                    <button
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                      onClick={() => {
                        builder.ungroup(groupContextMenu.groupId)
                        setGroupContextMenu(null)
                      }}
                    >
                      <Ungroup className="size-3.5" />
                      Ungroup
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                      onClick={() => {
                        builder.toggleSuspend(groupContextMenu.groupId)
                        setGroupContextMenu(null)
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
          <PipelineRunPanel
            state={pipelineRun.state}
            onReset={pipelineRun.reset}
          />
        </div>
      </div>
    </ValidationContext.Provider>
  )
}
