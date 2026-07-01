'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrchestrator } from '@/context/orchestrator-context';
import { Pipeline, PipelineNode, NodeType } from '../../types';
import StatusBadge from '../shared/StatusBadge';
import { 
  ReactFlow, 
  ReactFlowProvider, 
  useReactFlow, 
  Background, 
  Handle, 
  Position,
  useNodesState,
  useEdgesState,
  Connection,
  FinalConnectionState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  buildWorkflowEdge,
  canCreateWorkflowEdge,
  findWorkflowNodeId,
  getDefaultTargetHandle,
} from './workflow-connections';
import { 
  Play, 
  ChevronRight, 
  Database, 
  SlidersHorizontal, 
  Cpu, 
  Code,
  CheckCircle,
  Clock,
  ArrowLeft,
  X,
  Sparkles,
  Terminal,
  Plus,
  Trash2,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface PipelineStudioScreenProps {
  pipeline: Pipeline;
}

// Node Templates grouped by Category
const NODE_TEMPLATES = [
  {
    category: 'Load Dataset',
    items: [
      {
        name: 'Load Dataset Node',
        type: 'ingestion',
        description: 'Loads local or cloud tabular datasets into DataFrame format.',
        code: `import pandas as pd\n\ndef execute():\n    # Load CSV data\n    df = pd.read_csv("dataset.csv")\n    print("Loaded dataset shape:", df.shape)\n    return df`,
        inputs: [],
        outputs: [{ name: 'dataset', type: 'DataFrame' }]
      }
    ]
  },
  {
    category: 'Data Processing',
    items: [
      {
        name: 'Scaler Node',
        type: 'preprocessing',
        description: 'Applies Standard/MinMax Scaling to numerical features.',
        code: `from sklearn.preprocessing import StandardScaler\n\ndef execute(df):\n    print("Scaling numerical features...")\n    scaler = StandardScaler()\n    return scaler.fit_transform(df)`,
        inputs: [{ name: 'dataset', type: 'DataFrame' }],
        outputs: [{ name: 'processed_data', type: 'DataFrame' }]
      },
      {
        name: 'Imputer Node',
        type: 'preprocessing',
        description: 'Fills null parameters with median or statistical averages.',
        code: `def execute(df):\n    print("Imputing missing values...")\n    return df.fillna(df.median())`,
        inputs: [{ name: 'dataset', type: 'DataFrame' }],
        outputs: [{ name: 'processed_data', type: 'DataFrame' }]
      },
      {
        name: 'Feature Selector Node',
        type: 'preprocessing',
        description: 'Selects the top features based on statistical importance.',
        code: `def execute(df):\n    print("Running feature selector...")\n    return df.dropna(thresh=len(df)*0.8, axis=1)`,
        inputs: [{ name: 'dataset', type: 'DataFrame' }],
        outputs: [{ name: 'processed_data', type: 'DataFrame' }]
      }
    ]
  },
  {
    category: 'Model Training',
    items: [
      {
        name: 'Model Node',
        type: 'training',
        description: 'Trains an XGBoost gradient boosted tree on input datasets.',
        code: `import xgboost as xgb\n\ndef execute(train_df):\n    print("Training XGBoost Classifier...")\n    model = xgb.XGBClassifier(n_estimators=100)\n    # Fit training model\n    return model`,
        inputs: [{ name: 'training_data', type: 'DataFrame' }],
        outputs: [
          { name: 'save_model', type: 'Model' },
          { name: 'compute_metric', type: 'Model' },
          { name: 'create_artifacts', type: 'Model' }
        ]
      }
    ]
  },
  {
    category: 'Evaluation',
    items: [
      {
        name: 'Compute Metrics Node',
        type: 'evaluation',
        description: 'Calculates precision, recall, and accuracy metrics.',
        code: `from sklearn.metrics import classification_report\n\ndef execute(model, X_test, y_test):\n    print("Calculating evaluation metrics...")\n    preds = model.predict(X_test)\n    return classification_report(y_test, preds)`,
        inputs: [{ name: 'model_eval', type: 'Model' }],
        outputs: []
      }
    ]
  },
  {
    category: 'Deployment & Export',
    items: [
      {
        name: 'Save Model Node',
        type: 'deploy',
        description: 'Saves model weights locally or pushes to central registries.',
        code: `import joblib\n\ndef execute(model):\n    print("Saving model weights registry...")\n    joblib.dump(model, "model_weights.joblib")`,
        inputs: [{ name: 'model_save', type: 'Model' }],
        outputs: []
      },
      {
        name: 'Create Artifacts Node',
        type: 'deploy',
        description: 'Combines model weights and schema specs into a tarball.',
        code: `def execute(model):\n    print("Creating deployment artifacts...")\n    # Tar file packaging logic\n    return True`,
        inputs: [{ name: 'model_art', type: 'Model' }],
        outputs: []
      }
    ]
  }
];

// Custom Node for React Flow
const CustomNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const { node, isRunningNode, getNodeIcon, onHandleClick } = data;
  
  const handleStyle = {
    borderRadius: '50%',
    border: '2px solid #131315',
    width: '12px',
    height: '12px',
    zIndex: 50,
    pointerEvents: 'all' as const,
    cursor: 'crosshair',
    transition: 'all 0.15s ease-in-out',
  };

  return (
    <div
      className={`relative w-48 bg-[#131315]/95 border-2 rounded-xl p-4 cursor-pointer transition-all hover:border-[#353437] ${
        selected 
          ? 'border-[#3192fc] shadow-[0_0_15px_rgba(49,146,252,0.15)] bg-[#1c1d22]' 
          : node.status === 'success'
          ? 'border-[#32D583]/50 hover:border-[#32D583]'
          : node.status === 'error'
          ? 'border-[#F04438]/50 hover:border-[#F04438]'
          : 'border-[#1F1F23] hover:border-[#404753]'
      } ${isRunningNode ? 'animate-pulse ring-2 ring-[#3192fc]/40' : ''}`}
    >
      {/* Target (Input) Handles */}
      {node.type === 'ingestion' && (
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{ left: '-6px', backgroundColor: '#3192fc', ...handleStyle }}
        />
      )}

      {node.type === 'preprocessing' && (
        <Handle
          type="target"
          position={Position.Left}
          id="data_in"
          style={{ left: '-6px', backgroundColor: '#3192fc', ...handleStyle }}
        />
      )}
      
      {node.type === 'training' && (
        <Handle
          type="target"
          position={Position.Left}
          id="training_data"
          style={{ left: '-6px', backgroundColor: '#3192fc', ...handleStyle }}
        />
      )}

      {node.type === 'evaluation' && (
        <Handle
          type="target"
          position={Position.Left}
          id="eval_in"
          style={{ left: '-6px', backgroundColor: '#F79009', ...handleStyle }}
        />
      )}

      {node.type === 'deploy' && (
        <Handle
          type="target"
          position={Position.Left}
          id={node.name.toLowerCase().includes('artifact') ? 'art_in' : 'save_in'}
          style={{ 
            left: '-6px', 
            backgroundColor: node.name.toLowerCase().includes('artifact') ? '#7A5AF8' : '#32D583', 
            ...handleStyle 
          }}
        />
      )}

      {/* Top status pulse */}
      {node.status === 'running' && (
        <span className="absolute top-2 right-2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3192fc] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3192fc]"></span>
        </span>
      )}

      <div className="flex items-center space-x-2.5 mb-2">
        <div className="p-1.5 bg-[#1F1F23] rounded-lg border border-[#353437]">
          {getNodeIcon(node.type)}
        </div>
        <span className="text-[9px] font-mono capitalize px-1.5 py-0.5 rounded bg-[#353437] text-[#c0c7d5]">
          {node.type === 'ingestion' ? 'dataset' : node.type}
        </span>
      </div>

      <h4 className="text-xs font-bold text-[#e5e1e4] truncate">
        {node.name}
      </h4>
      
      <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#1F1F23] text-[9px] font-mono text-[#c0c7d5]/60">
        <span>Duration:</span>
        <span className="text-[#e5e1e4]">{node.duration || 'Idle'}</span>
      </div>

      {/* Source (Output) Handles */}
      {node.type === 'ingestion' && (
        <>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-20">
            <button
              onClick={(e) => onHandleClick(e, 'data_out', 'source')}
              className="w-3.5 h-3.5 rounded bg-[#1F1F23]/80 hover:bg-[#32D583] hover:text-white text-[#c0c7d5] flex items-center justify-center border border-[#353437] transition-colors cursor-pointer mr-1"
              title="Add compatible node"
            >
              <Plus className="w-2 h-2" />
            </button>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id="data_out"
            style={{ right: '-6px', backgroundColor: '#32D583', ...handleStyle }}
          />
        </>
      )}

      {node.type === 'preprocessing' && (
        <>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-20">
            <button
              onClick={(e) => onHandleClick(e, 'data_out', 'source')}
              className="w-3.5 h-3.5 rounded bg-[#1F1F23]/80 hover:bg-[#32D583] hover:text-white text-[#c0c7d5] flex items-center justify-center border border-[#353437] transition-colors cursor-pointer mr-1"
              title="Add compatible node"
            >
              <Plus className="w-2 h-2" />
            </button>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id="data_out"
            style={{ right: '-6px', backgroundColor: '#32D583', ...handleStyle }}
          />
        </>
      )}

      {node.type === 'training' && (
        <div className="flex flex-col space-y-2 mt-3 pt-2 border-t border-[#1F1F23]">
          {/* Row 1: Save Model */}
          <div className="relative flex items-center justify-end text-[10px] text-[#c0c7d5]/80 h-5">
            <span className="mr-2 font-mono text-[9px]">Save Model</span>
            <button
              onClick={(e) => onHandleClick(e, 'save_model', 'source')}
              className="w-3.5 h-3.5 rounded bg-[#1F1F23]/80 hover:bg-[#32D583] hover:text-white text-[#c0c7d5] flex items-center justify-center border border-[#353437] transition-colors cursor-pointer mr-1"
              title="Add Save Model"
            >
              <Plus className="w-2 h-2" />
            </button>
            <Handle
              type="source"
              position={Position.Right}
              id="save_model"
              style={{ top: '50%', right: '-23px', backgroundColor: '#32D583', ...handleStyle }}
            />
          </div>

          {/* Row 2: Compute Metric */}
          <div className="relative flex items-center justify-end text-[10px] text-[#c0c7d5]/80 h-5">
            <span className="mr-2 font-mono text-[9px]">Compute Metric</span>
            <button
              onClick={(e) => onHandleClick(e, 'compute_metric', 'source')}
              className="w-3.5 h-3.5 rounded bg-[#1F1F23]/80 hover:bg-[#F79009] hover:text-white text-[#c0c7d5] flex items-center justify-center border border-[#353437] transition-colors cursor-pointer mr-1"
              title="Add Compute Metrics"
            >
              <Plus className="w-2 h-2" />
            </button>
            <Handle
              type="source"
              position={Position.Right}
              id="compute_metric"
              style={{ top: '50%', right: '-23px', backgroundColor: '#F79009', ...handleStyle }}
            />
          </div>

          {/* Row 3: Create Artifacts */}
          <div className="relative flex items-center justify-end text-[10px] text-[#c0c7d5]/80 h-5">
            <span className="mr-2 font-mono text-[9px]">Artifacts</span>
            <button
              onClick={(e) => onHandleClick(e, 'create_artifacts', 'source')}
              className="w-3.5 h-3.5 rounded bg-[#1F1F23]/80 hover:bg-[#7A5AF8] hover:text-white text-[#c0c7d5] flex items-center justify-center border border-[#353437] transition-colors cursor-pointer mr-1"
              title="Add Create Artifacts"
            >
              <Plus className="w-2 h-2" />
            </button>
            <Handle
              type="source"
              position={Position.Right}
              id="create_artifacts"
              style={{ top: '50%', right: '-23px', backgroundColor: '#7A5AF8', ...handleStyle }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default function PipelineStudioScreen(props: PipelineStudioScreenProps) {
  return (
    <ReactFlowProvider>
      <PipelineStudioScreenContent {...props} />
    </ReactFlowProvider>
  );
}

function PipelineStudioScreenContent({ pipeline }: PipelineStudioScreenProps) {
  const router = useRouter();
  const { updatePipeline, setLogs } = useOrchestrator();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    pipeline.nodes.length > 0 ? pipeline.nodes[0].id : null
  );
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunningNodeIndex, setCurrentRunningNodeIndex] = useState<number | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  
  // Custom context/handle states
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null);
  const [handleMenu, setHandleMenu] = useState<{ nodeId: string; handleId: string; type: 'source' | 'target'; x: number; y: number } | null>(null);
  const [showAddNodeDropdown, setShowAddNodeDropdown] = useState(false);

  // New Node Form state
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>('preprocessing');
  const [newNodeDescription, setNewNodeDescription] = useState('');

  // Code Editor state
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [editingCode, setEditingCode] = useState('');

  // Custom Block states
  const [inputSchema, setInputSchema] = useState<{ name: string; type: string }[]>([
    { name: 'raw_data', type: 'DataFrame' },
    { name: 'batch_size', type: 'Scalar' }
  ]);
  const [outputSchema, setOutputSchema] = useState<{ name: string; type: string }[]>([
    { name: 'processed_tensors', type: 'Tensor' }
  ]);
  const [customBlockCode, setCustomBlockCode] = useState(`def execute(inputs, parameters):
    # Your custom logic here
    return outputs`);
  const [validationSuccess, setValidationSuccess] = useState<boolean | null>(null);

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { zoomIn, zoomOut, screenToFlowPosition, setViewport } = useReactFlow();

  const graphContainerRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    if (!graphContainerRef.current) return;
    if (!document.fullscreenElement) {
      graphContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Set initial logs or empty
  useEffect(() => {
    setTerminalLogs([
      `[SYS] Loaded Pipeline DAG: ${pipeline.name}`,
      `[SYS] Cluster connection: ACTIVE on gpc-stage-us-central1`,
      `[SYS] Click "Run Pipeline" to commence automated workflow compilation.`
    ]);
  }, [pipeline.id]);

  // Scroll to bottom of logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Sync menus close
  useEffect(() => {
    const closeMenus = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.add-node-btn') || target.closest('.add-node-dropdown')) {
        return;
      }
      if (target.closest('.react-flow__handle') || target.closest('.handle-menu-popover')) {
        return;
      }
      setContextMenu(null);
      setHandleMenu(null);
      setShowAddNodeDropdown(false);
    };
    document.addEventListener('click', closeMenus);
    return () => {
      document.removeEventListener('click', closeMenus);
    };
  }, []);

  // Sync local nodes / edges state with context data
  const syncPipelineData = useCallback((newNodes = nodes, newEdges = edges) => {
    const updatedPipelineNodes = newNodes.map(rn => {
      const originalNode = pipeline.nodes.find(n => n.id === rn.id) || rn.data.node;
      return {
        ...originalNode,
        position: rn.position
      };
    });

    const updatedPipelineEdges = newEdges.map(re => ({
      id: re.id,
      source: re.source,
      target: re.target,
      sourceHandle: re.sourceHandle || null,
      targetHandle: re.targetHandle || null
    }));

    updatePipeline({
      ...pipeline,
      nodes: updatedPipelineNodes,
      edges: updatedPipelineEdges,
      nodeCount: updatedPipelineNodes.length
    });
  }, [nodes, edges, pipeline, updatePipeline]);

  // Handle Dragging
  const onNodeDragStop = useCallback(() => {
    syncPipelineData();
  }, [syncPipelineData]);

  // Pane Clicking
  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    setHandleMenu(null);
    setShowAddNodeDropdown(false);
  }, []);

  // Handle click on node handles
  const onHandleClick = useCallback((event: React.MouseEvent, nodeId: string, handleId: string, type: 'source' | 'target') => {
    event.stopPropagation();
    event.preventDefault();
    const rect = graphContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setHandleMenu({
      nodeId,
      handleId,
      type,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
  }, []);

  // Initialize nodes and edges on load or pipeline change
  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case 'ingestion':
        return <Database className="w-4 h-4 text-[#0086C9]" />;
      case 'preprocessing':
        return <SlidersHorizontal className="w-4 h-4 text-[#a6c8ff]" />;
      case 'training':
        return <Cpu className="w-4 h-4 text-[#7A5AF8]" />;
      case 'evaluation':
        return <Code className="w-4 h-4 text-[#F79009]" />;
      case 'deploy':
        return <CheckCircle className="w-4 h-4 text-[#32D583]" />;
    }
  };

  useEffect(() => {
    const formattedNodes = pipeline.nodes.map((node) => {
      const position = node.position || { x: pipeline.nodes.indexOf(node) * 240 + 40, y: 150 };
      return {
        id: node.id,
        type: 'customNode',
        position,
        selected: selectedNodeId === node.id,
        data: {
          node,
          isRunningNode: false,
          getNodeIcon,
          onHandleClick: (e: React.MouseEvent, handleId: string, type: 'source' | 'target') => {
            onHandleClick(e, node.id, handleId, type);
          }
        }
      };
    });
    setNodes(formattedNodes);

    if (pipeline.edges) {
      setEdges(pipeline.edges.map(e => {
        const sourceHandle = e.sourceHandle;
        let stroke = '#3192fc';
        if (sourceHandle === 'data_out' || sourceHandle === 'save_model') stroke = '#32D583';
        else if (sourceHandle === 'compute_metric') stroke = '#F79009';
        else if (sourceHandle === 'create_artifacts') stroke = '#7A5AF8';

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || undefined,
          targetHandle: e.targetHandle || undefined,
          animated: pipeline.status === 'running',
          style: { 
            stroke, 
            strokeWidth: 3,
            filter: `drop-shadow(0px 0px 3px ${stroke}80)`
          }
        };
      }));
    } else {
      const fallbackEdges = [];
      for (let i = 0; i < pipeline.nodes.length - 1; i++) {
        const source = pipeline.nodes[i];
        const target = pipeline.nodes[i + 1];
        fallbackEdges.push({
          id: `e-${source.id}-${target.id}`,
          source: source.id,
          target: target.id,
          sourceHandle: source.type === 'ingestion' || source.type === 'preprocessing' ? 'data_out' : undefined,
          targetHandle: target.type === 'preprocessing' ? 'data_in' : target.type === 'training' ? 'training_data' : undefined,
          animated: source.status === 'running' || source.status === 'success',
          style: {
            stroke: source.status === 'success' ? '#32D583' : '#353437',
            strokeWidth: 3
          }
        });
      }
      setEdges(fallbackEdges);
    }
  }, [pipeline.id]); // trigger only when switching pipelines to keep local positions intact

  // Keep selection synced to local state
  useEffect(() => {
    setNodes(prev => prev.map(n => ({
      ...n,
      selected: selectedNodeId === n.id
    })));
  }, [selectedNodeId]);

  const selectedNode = pipeline.nodes.find(n => n.id === selectedNodeId);

  // Pane Context Menu right click
  const onPaneContextMenu = useCallback(
    (event: any) => {
      event.preventDefault();
      const rect = graphContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setContextMenu({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        flowX: flowPos.x,
        flowY: flowPos.y,
      });
    },
    [screenToFlowPosition]
  );

  const appendConnection = useCallback((connection: Parameters<typeof buildWorkflowEdge>[0]) => {
    if (!canCreateWorkflowEdge(isRunning)) return;

    const newEdge = buildWorkflowEdge(connection);
    const updatedEdges = [...edges, newEdge];
    setEdges(updatedEdges);
    syncPipelineData(nodes, updatedEdges);
  }, [nodes, edges, isRunning, setEdges, syncPipelineData]);

  // Handle drag connect
  const onConnect = useCallback((params: Connection) => {
    appendConnection({
      ...params,
      id: `e-${params.source}-${params.target}-${Date.now()}`,
    });
  }, [appendConnection]);

  // Treat the whole node body as a valid drop target.
  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
    if (isRunning || state.isValid || !state.fromNode) return;

    const pointer = 'changedTouches' in event ? event.changedTouches[0] : event;
    if (!pointer) return;

    const targetId = findWorkflowNodeId(
      document.elementsFromPoint(pointer.clientX, pointer.clientY),
    );
    const targetNode = nodes.find(node => node.id === targetId);
    if (!targetNode) return;

    appendConnection({
      id: `e-${state.fromNode.id}-${targetNode.id}-${Date.now()}`,
      source: state.fromNode.id,
      target: targetNode.id,
      sourceHandle: state.fromHandle?.id,
      targetHandle: getDefaultTargetHandle(targetNode.data.node.type, targetNode.data.node.name),
    });
  }, [appendConnection, isRunning, nodes]);

  // Handle edge deletion (Backspace/Delete key)
  const onEdgesDelete = useCallback((edgesToDelete: any[]) => {
    if (isRunning) return;
    const updatedEdges = edges.filter(e => !edgesToDelete.some(ed => ed.id === e.id));
    setEdges(updatedEdges);
    syncPipelineData(nodes, updatedEdges);
    
    setTerminalLogs(prev => [
      ...prev,
      `[SYS] Connection removed between nodes.`
    ]);
  }, [edges, nodes, isRunning, syncPipelineData]);

  // Handle node deletion (Backspace/Delete key)
  const onNodesDelete = useCallback((nodesToDelete: any[]) => {
    if (isRunning) return;
    const updatedNodes = nodes.filter(n => !nodesToDelete.some(nd => nd.id === n.id));
    setNodes(updatedNodes);
    const updatedEdges = edges.filter(
      e => !nodesToDelete.some(nd => nd.id === e.source || nd.id === e.target)
    );
    setEdges(updatedEdges);
    syncPipelineData(updatedNodes, updatedEdges);

    if (nodesToDelete.some(nd => nd.id === selectedNodeId)) {
      setSelectedNodeId(updatedNodes.length > 0 ? updatedNodes[0].id : null);
    }
    
    setTerminalLogs(prev => [
      ...prev,
      `[SYS] Node and its associated connections removed.`
    ]);
  }, [nodes, edges, isRunning, selectedNodeId, syncPipelineData]);

  // Get compatible nodes list for overlay popup
  const getCompatibleNodesForHandle = (nodeType: NodeType, handleId: string, type: 'source' | 'target') => {
    if (type === 'source') {
      if (nodeType === 'ingestion' || nodeType === 'preprocessing') {
        return [
          { name: 'Scaler Node', type: 'preprocessing', templateName: 'Scaler Node' },
          { name: 'Imputer Node', type: 'preprocessing', templateName: 'Imputer Node' },
          { name: 'Feature Selector Node', type: 'preprocessing', templateName: 'Feature Selector Node' },
          { name: 'Model Node', type: 'training', templateName: 'Model Node' }
        ];
      }
      if (nodeType === 'training') {
        if (handleId === 'save_model') {
          return [{ name: 'Save Model Node', type: 'deploy', templateName: 'Save Model Node' }];
        }
        if (handleId === 'compute_metric') {
          return [{ name: 'Compute Metrics Node', type: 'evaluation', templateName: 'Compute Metrics Node' }];
        }
        if (handleId === 'create_artifacts') {
          return [{ name: 'Create Artifacts Node', type: 'deploy', templateName: 'Create Artifacts Node' }];
        }
      }
    } else {
      if (nodeType === 'preprocessing' || nodeType === 'training') {
        return [
          { name: 'Load Dataset Node', type: 'ingestion', templateName: 'Load Dataset Node' },
          { name: 'Scaler Node', type: 'preprocessing', templateName: 'Scaler Node' },
          { name: 'Imputer Node', type: 'preprocessing', templateName: 'Imputer Node' }
        ];
      }
      if (nodeType === 'evaluation' || nodeType === 'deploy') {
        return [{ name: 'Model Node', type: 'training', templateName: 'Model Node' }];
      }
    }
    return [];
  };

  // Add a node and connect it instantly (used by popup suggestion handles)
  const addNodeAndConnect = (templateName: string) => {
    if (!handleMenu) return;

    let foundItem = null;
    for (const cat of NODE_TEMPLATES) {
      const match = cat.items.find(i => i.name === templateName);
      if (match) {
        foundItem = match;
        break;
      }
    }
    if (!foundItem) return;

    const parentNode = nodes.find(n => n.id === handleMenu.nodeId);
    const parentX = parentNode ? parentNode.position.x : 100;
    const parentY = parentNode ? parentNode.position.y : 150;

    const offset = (Math.random() - 0.5) * 60;
    const newX = handleMenu.type === 'source' ? parentX + 260 : parentX - 260;
    const newY = parentY + offset;

    const newId = `node-${Date.now()}`;
    const newNode: PipelineNode = {
      id: newId,
      name: foundItem.name,
      type: foundItem.type as NodeType,
      status: 'idle',
      description: foundItem.description,
      duration: 'Pending',
      code: foundItem.code,
      inputs: foundItem.inputs,
      outputs: foundItem.outputs,
      position: { x: newX, y: newY }
    };

    const newRfNode = {
      id: newId,
      type: 'customNode',
      position: { x: newX, y: newY },
      data: {
        node: newNode,
        isRunningNode: false,
        getNodeIcon,
        onHandleClick: (e: React.MouseEvent, handleId: string, type: 'source' | 'target') => {
          onHandleClick(e, newId, handleId, type);
        }
      }
    };

    let sourceNodeId = '';
    let targetNodeId = '';
    let sourceHandleId = '';
    let targetHandleId = '';

    if (handleMenu.type === 'source') {
      sourceNodeId = handleMenu.nodeId;
      sourceHandleId = handleMenu.handleId;
      targetNodeId = newId;
      if (foundItem.type === 'preprocessing') targetHandleId = 'data_in';
      else if (foundItem.type === 'training') targetHandleId = 'training_data';
      else if (foundItem.type === 'evaluation') targetHandleId = 'eval_in';
      else if (foundItem.type === 'deploy') {
        targetHandleId = foundItem.name.includes('Artifact') ? 'art_in' : 'save_in';
      }
    } else {
      sourceNodeId = newId;
      if (foundItem.type === 'ingestion' || foundItem.type === 'preprocessing') sourceHandleId = 'data_out';
      else if (foundItem.type === 'training') {
        const targetNode = nodes.find(n => n.id === handleMenu.nodeId);
        const targetName = targetNode?.data?.node?.name || '';
        if (targetName.includes('Artifact')) sourceHandleId = 'create_artifacts';
        else if (targetName.includes('Metrics') || targetNode?.data?.node?.type === 'evaluation') sourceHandleId = 'compute_metric';
        else sourceHandleId = 'save_model';
      }
      targetNodeId = handleMenu.nodeId;
      targetHandleId = handleMenu.handleId;
    }

    const newEdgeId = `e-${sourceNodeId}-${targetNodeId}-${Date.now()}`;
    let edgeStroke = '#3192fc';
    if (sourceHandleId === 'data_out' || sourceHandleId === 'save_model') edgeStroke = '#32D583';
    else if (sourceHandleId === 'compute_metric') edgeStroke = '#F79009';
    else if (sourceHandleId === 'create_artifacts') edgeStroke = '#7A5AF8';

    const newRfEdge = {
      id: newEdgeId,
      source: sourceNodeId,
      target: targetNodeId,
      sourceHandle: sourceHandleId || undefined,
      targetHandle: targetHandleId || undefined,
      animated: false,
      style: { 
        stroke: edgeStroke, 
        strokeWidth: 3,
        filter: `drop-shadow(0px 0px 3px ${edgeStroke}80)`
      }
    };

    const updatedNodes = [...nodes, newRfNode];
    const updatedEdges = [...edges, newRfEdge];

    setNodes(updatedNodes);
    setEdges(updatedEdges);
    syncPipelineData(updatedNodes, updatedEdges);
    setHandleMenu(null);

    setTerminalLogs(prev => [
      ...prev,
      `[SYS] Created and connected node [${foundItem.name}] to graph.`
    ]);
  };

  // Topological sorting helper for simulations
  const getTopologicalOrder = (pipelineNodes: PipelineNode[], pipelineEdges: any[]): PipelineNode[] => {
    const adj: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};

    pipelineNodes.forEach(node => {
      adj[node.id] = [];
      inDegree[node.id] = 0;
    });

    pipelineEdges.forEach(edge => {
      if (adj[edge.source] && inDegree[edge.target] !== undefined) {
        adj[edge.source].push(edge.target);
        inDegree[edge.target]++;
      }
    });

    const queue: string[] = [];
    pipelineNodes.forEach(node => {
      if (inDegree[node.id] === 0) {
        queue.push(node.id);
      }
    });

    const order: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      order.push(u);

      const neighbors = adj[u] || [];
      neighbors.forEach(v => {
        inDegree[v]--;
        if (inDegree[v] === 0) {
          queue.push(v);
        }
      });
    }

    pipelineNodes.forEach(node => {
      if (!order.includes(node.id)) {
        order.push(node.id);
      }
    });

    return order.map(id => pipelineNodes.find(n => n.id === id)!).filter(Boolean);
  };

  // Mock code scripts based on NodeType
  const getCodeSnippet = (type: NodeType, nodeName: string) => {
    switch (type) {
      case 'ingestion':
        return `import pandas as pd
from google.cloud import storage

def ingest_data(bucket_name, file_path):
    """Ingests raw file from GCS buckets"""
    print(f"Connecting to bucket: {bucket_name}")
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(file_path)
    
    # Download chunk as dataframe
    raw_df = pd.read_parquet(blob.public_url)
    print(f"Successfully loaded {len(raw_df)} records.")
    return raw_df

# Target execution
data = ingest_data("ml-prod-records", "${nodeName.toLowerCase()}.parquet")`;
      case 'preprocessing':
        return `import numpy as np
from sklearn.preprocessing import StandardScaler

def pipeline_preprocess(df):
    """Handles standard scaling, missing values and label encoding"""
    print("Initiating automatic imputer scaling...")
    num_cols = df.select_dtypes(include=[np.number]).columns
    
    # Standardize numerical features
    scaler = StandardScaler()
    df[num_cols] = scaler.fit_transform(df[num_cols].fillna(0))
    
    print(f"Preprocessed numerical columns: {list(num_cols)}")
    return df`;
      case 'training':
        return `import xgboost as xgb
from sklearn.model_selection import train_test_split

def train_model(X, y):
    """Trains Gradient Boosting trees with optimal hyper-parameters"""
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2)
    
    # XGBoost classifier definition
    model = xgb.XGBClassifier(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8
    )
    
    print("Training started on NVIDIA Tensor A100 GPU...")
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=True)
    return model`;
      case 'evaluation':
        return `from sklearn.metrics import classification_report, roc_auc_score

def evaluate_metrics(model, X_test, y_test):
    """Generates evaluation matrix"""
    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]
    
    accuracy = (preds == y_test).mean()
    auc = roc_auc_score(y_test, probs)
    
    print(f"=== Model Performance ===")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"ROC-AUC:  {auc:.4f}")
    
    return {"accuracy": accuracy, "auc": auc}`;
      case 'deploy':
        return `import requests

def deploy_model_endpoint(model, stage="production"):
    """Deploys binary model to Cloud Run microservices"""
    api_endpoint = f"https://api.model-registry.internal/v1/deploy"
    payload = {
        "model_id": "${pipeline.id}",
        "stage": stage,
        "traffic_split": 100
    }
    
    response = requests.post(api_endpoint, json=payload)
    print(f"Endpoint registered: {response.json().get('url')}")
    return response.status_code == 200`;
    }
  };

  // Node parameters configuration
  const getNodeParameters = (type: NodeType) => {
    switch (type) {
      case 'ingestion':
        return [
          { name: 'Data Source', value: 'Google Cloud Storage (Parquet)' },
          { name: 'Batch Size', value: '65,536 lines' },
          { name: 'Partition Column', value: 'timestamp_utc' }
        ];
      case 'preprocessing':
        return [
          { name: 'Imputation Strategy', value: 'median' },
          { name: 'Scaling Factor', value: 'StandardScaler' },
          { name: 'Hot Encoded Dimensions', value: '18 categories' }
        ];
      case 'training':
        return [
          { name: 'Algorithm', value: 'XGBoost / LightGBM' },
          { name: 'Max Tree Depth', value: '6 nodes' },
          { name: 'Learning Rate', value: '0.05' },
          { name: 'Compute Target', value: 'NVIDIA GPU A100' }
        ];
      case 'evaluation':
        return [
          { name: 'Validation Set Split', value: '20% random seed 42' },
          { name: 'Target Accuracy Metric', value: '>= 0.92' },
          { name: 'Confusion Matrix Log', value: 'W&B integration' }
        ];
      case 'deploy':
        return [
          { name: 'Instance Class', value: 'gpc-n2-standard-4' },
          { name: 'Min Instances', value: '1 pod' },
          { name: 'Max Instances', value: '10 pods (AutoScale)' }
        ];
    }
  };

  const nodeTypes = useMemo(() => ({ customNode: CustomNode }), []);

  // Run DAG execution simulation
  const runPipelineSimulation = () => {
    if (isRunning) return;

    setIsRunning(true);
    setTerminalLogs(prev => [
      ...prev,
      `[RUN] Initializing compiled workspace for pipeline: ${pipeline.name}`,
      `[RUN] Dispatching orchestrator container ID: root_worker_${Math.floor(Math.random() * 90000 + 10000)}`
    ]);

    setLogs(prev => [
      { id: `log-${Date.now()}-init`, timestamp: new Date().toLocaleTimeString(), level: 'info', message: `Initializing compiled workspace for pipeline: ${pipeline.name}`, source: 'Orchestrator', pipelineId: pipeline.id },
      ...prev
    ]);

    // Topological Sort order of nodes
    const orderedNodes = getTopologicalOrder(pipeline.nodes, edges);

    // Reset nodes to idle status
    const initializedNodes: PipelineNode[] = pipeline.nodes.map(n => ({ ...n, status: 'idle', duration: 'Pending' }));
    
    // Update local React Flow nodes state to show all idle
    setNodes(prev => prev.map(rn => {
      const nodeObj = initializedNodes.find(n => n.id === rn.id);
      return {
        ...rn,
        data: {
          ...rn.data,
          node: nodeObj || rn.data.node,
          isRunningNode: false
        }
      };
    }));

    updatePipeline({ ...pipeline, status: 'running', nodes: initializedNodes });

    let currentIndex = 0;

    const executeNextNode = () => {
      if (currentIndex >= orderedNodes.length) {
        // Completed successfully!
        setIsRunning(false);
        
        const finalNodes: PipelineNode[] = initializedNodes.map(n => ({ ...n, status: 'success' }));
        
        // Update local React Flow nodes state to success
        setNodes(prev => prev.map(rn => {
          const nodeObj = finalNodes.find(n => n.id === rn.id);
          return {
            ...rn,
            data: {
              ...rn.data,
              node: nodeObj || rn.data.node,
              isRunningNode: false
            }
          };
        }));

        updatePipeline({
          ...pipeline,
          status: 'success',
          nodes: finalNodes,
          updatedTime: 'Updated just now'
        });
        
        setTerminalLogs(prev => [
          ...prev,
          `[SYS] SUCCESS: Full graph compiled and deployed cleanly.`,
          `[SYS] Endpoint live at: https://gpc-model-service.internal/v1/predict/${pipeline.id}`,
          `[SYS] Evaluation metrics written to persistent catalog successfully.`
        ]);

        setLogs(prev => [
          { id: `log-${Date.now()}-done`, timestamp: new Date().toLocaleTimeString(), level: 'success', message: `SUCCESS: Full graph for pipeline ${pipeline.name} compiled and deployed. Route path: v1/predict/${pipeline.id}`, source: 'Orchestrator', pipelineId: pipeline.id },
          ...prev
        ]);
        return;
      }

      const activeNode = orderedNodes[currentIndex];
      
      // Update local nodes to show activeNode is running
      setNodes(prev => prev.map(rn => {
        if (rn.id === activeNode.id) {
          return {
            ...rn,
            data: {
              ...rn.data,
              node: { ...rn.data.node, status: 'running' },
              isRunningNode: true
            }
          };
        }
        return rn;
      }));

      // Update in initializedNodes list
      const idxInInit = initializedNodes.findIndex(n => n.id === activeNode.id);
      if (idxInInit !== -1) {
        initializedNodes[idxInInit].status = 'running';
      }

      updatePipeline({ ...pipeline, status: 'running', nodes: [...initializedNodes] });
      setSelectedNodeId(activeNode.id);

      setTerminalLogs(prev => [
        ...prev,
        `[EXEC] Starting Node [${currentIndex + 1}/${orderedNodes.length}]: ${activeNode.name} (${activeNode.type})`,
        `[EXEC] Fetching parameters and code dependencies...`,
        `[EXEC] Initializing container runtime...`
      ]);

      setTimeout(() => {
        setTerminalLogs(prev => [
          ...prev,
          `[EXEC] [LOG] [${activeNode.name}] Connecting to resource nodes...`,
          `[EXEC] [LOG] [${activeNode.name}] Processing metrics: batch_size=65536`,
          `[EXEC] [LOG] [${activeNode.name}] Execution completed in 1.4s. Clean status.`
        ]);

        setLogs(prev => [
          { id: `log-${Date.now()}-${activeNode.id}`, timestamp: new Date().toLocaleTimeString(), level: 'success', message: `Node [${activeNode.name}] executed successfully in 1.4s`, source: 'ComputeNode', pipelineId: pipeline.id },
          ...prev
        ]);

        // Mark node success in local state
        setNodes(prev => prev.map(rn => {
          if (rn.id === activeNode.id) {
            return {
              ...rn,
              data: {
                ...rn.data,
                node: { ...rn.data.node, status: 'success', duration: '1.4s' },
                isRunningNode: false
              }
            };
          }
          return rn;
        }));

        if (idxInInit !== -1) {
          initializedNodes[idxInInit].status = 'success';
          initializedNodes[idxInInit].duration = '1.4s';
        }

        updatePipeline({ ...pipeline, status: 'running', nodes: [...initializedNodes] });

        currentIndex++;
        executeNextNode();
      }, 2500);
    };

    executeNextNode();
  };

  // Add a new node to the pipeline
  const handleAddNode = () => {
    if (!newNodeName.trim()) return;

    const node: PipelineNode = {
      id: `node-${Date.now()}`,
      name: newNodeName,
      type: 'preprocessing',
      status: 'idle',
      description: newNodeDescription || 'Custom block computation step.',
      duration: 'Pending',
      code: customBlockCode,
      inputs: inputSchema.filter(f => f.name.trim() !== ''),
      outputs: outputSchema.filter(f => f.name.trim() !== ''),
      position: { x: nodes.length * 240 + 40, y: 150 }
    };

    const newRfNode = {
      id: node.id,
      type: 'customNode',
      position: { x: nodes.length * 240 + 40, y: 150 },
      data: {
        node,
        isRunningNode: false,
        getNodeIcon,
        onHandleClick: (e: React.MouseEvent, handleId: string, type: 'source' | 'target') => {
          onHandleClick(e, node.id, handleId, type);
        }
      }
    };

    const updatedNodes = [...nodes, newRfNode];
    setNodes(updatedNodes);
    syncPipelineData(updatedNodes, edges);
    
    setSelectedNodeId(node.id);
    
    // Reset form
    setNewNodeName('');
    setNewNodeDescription('');
    setInputSchema([
      { name: 'raw_data', type: 'DataFrame' },
      { name: 'batch_size', type: 'Scalar' }
    ]);
    setOutputSchema([
      { name: 'processed_tensors', type: 'Tensor' }
    ]);
    setCustomBlockCode(`def execute(inputs, parameters):
    # Your custom logic here
    return outputs`);
    setValidationSuccess(null);
    setShowAddNodeModal(false);

    setTerminalLogs(prev => [
      ...prev,
      `[SYS] Custom block [${newNodeName}] added to workflow diagram successfully.`
    ]);
  };

  const handleValidateCode = () => {
    if (customBlockCode.includes('def execute(') && customBlockCode.includes('return')) {
      setValidationSuccess(true);
      setTerminalLogs(prev => [
        ...prev,
        `[VAL] Python syntax validation PASSED for custom block.`
      ]);
    } else {
      setValidationSuccess(false);
      setTerminalLogs(prev => [
        ...prev,
        `[VAL] Validation FAILED: Missing 'def execute' signature or 'return' statement.`
      ]);
    }
  };

  // Delete selected node
  const handleDeleteNode = (nodeId: string) => {
    const updatedRfNodes = nodes.filter(n => n.id !== nodeId);
    const updatedRfEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);

    setNodes(updatedRfNodes);
    setEdges(updatedRfEdges);
    syncPipelineData(updatedRfNodes, updatedRfEdges);

    if (selectedNodeId === nodeId) {
      setSelectedNodeId(updatedRfNodes.length > 0 ? updatedRfNodes[0].id : null);
    }

    setTerminalLogs(prev => [
      ...prev,
      `[SYS] Node removed from the DAG flow.`
    ]);
  };

  const handleOpenCodeEditor = () => {
    if (!selectedNode) return;
    const currentCode = selectedNode.code || getCodeSnippet(selectedNode.type, selectedNode.name);
    setEditingCode(currentCode);
    setShowCodeEditor(true);
  };

  const handleSaveCode = () => {
    if (!selectedNodeId) return;
    const updatedNodes = pipeline.nodes.map(node => {
      if (node.id === selectedNodeId) {
        return { ...node, code: editingCode };
      }
      return node;
    });
    updatePipeline({
      ...pipeline,
      nodes: updatedNodes
    });
    setNodes(prev => prev.map(rn => {
      if (rn.id === selectedNodeId) {
        return {
          ...rn,
          data: {
            ...rn.data,
            node: { ...rn.data.node, code: editingCode }
          }
        };
      }
      return rn;
    }));

    setShowCodeEditor(false);
    setTerminalLogs(prev => [
      ...prev,
      `[SYS] Saved updated python script for node: ${selectedNode?.name}`
    ]);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/')}
            className="p-1.5 rounded-lg border border-[#1F1F23] bg-[#131315] hover:bg-[#353437] text-[#c0c7d5] hover:text-[#e5e1e4] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-[#e5e1e4] tracking-tight">{pipeline.name}</h2>
              <StatusBadge status={pipeline.status} />
            </div>
            <p className="text-xs text-[#c0c7d5] mt-1">{pipeline.description}</p>
          </div>
        </div>

        {/* Studio actions */}
        <div className="flex items-center space-x-2">
          {pipeline.status === 'success' && (
            <button
              onClick={() => router.push(`/pipelines/${pipeline.id}/results`)}
              className="bg-[#32D583] hover:brightness-110 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-md"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>View Results</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAddNodeDropdown(!showAddNodeDropdown);
              }}
              disabled={isRunning}
              className="add-node-btn bg-[#131315] border border-[#1F1F23] hover:bg-[#353437] text-[#e5e1e4] text-xs font-semibold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Node</span>
            </button>
            {showAddNodeDropdown && (
              <div 
                className="add-node-dropdown absolute right-0 mt-2 bg-[#0c0c0e]/95 border border-[#1f1f23] rounded-xl shadow-2xl p-2.5 w-60 backdrop-blur-md transition-all divide-y divide-[#1f1f23]/60 z-50 max-h-96 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {NODE_TEMPLATES.map((cat, idx) => (
                  <div key={idx} className="py-1.5 first:pt-0 last:pb-0">
                    <div className="px-2.5 py-1 text-[9px] font-bold text-[#c0c7d5]/40 uppercase tracking-widest font-mono">
                      {cat.category}
                    </div>
                    {cat.items.map((item, itemIdx) => (
                      <button
                        key={itemIdx}
                        onClick={() => {
                          const newId = `node-${Date.now()}`;
                          const newNode: PipelineNode = {
                            id: newId,
                            name: item.name,
                            type: item.type as NodeType,
                            status: 'idle',
                            description: item.description,
                            duration: 'Pending',
                            code: item.code,
                            inputs: item.inputs,
                            outputs: item.outputs,
                            position: { x: nodes.length * 240 + 40, y: 150 }
                          };

                          const newRfNode = {
                            id: newId,
                            type: 'customNode',
                            position: { x: nodes.length * 240 + 40, y: 150 },
                            data: {
                              node: newNode,
                              isRunningNode: false,
                              getNodeIcon,
                              onHandleClick: (e: React.MouseEvent, handleId: string, type: 'source' | 'target') => {
                                onHandleClick(e, newId, handleId, type);
                              }
                            }
                          };

                          const updatedNodes = [...nodes, newRfNode];
                          setNodes(updatedNodes);
                          syncPipelineData(updatedNodes, edges);
                          setShowAddNodeDropdown(false);

                          setTerminalLogs(prev => [
                            ...prev,
                            `[SYS] Added node [${item.name}] to canvas.`
                          ]);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-[#c0c7d5] hover:bg-[#3192fc]/10 hover:text-white rounded-lg transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <span>{item.name}</span>
                        <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#3192fc] transition-opacity" />
                      </button>
                    ))}
                  </div>
                ))}
                <div className="pt-1.5 border-t border-[#1f1f23]/60">
                  <button
                    onClick={() => {
                      setShowAddNodeModal(true);
                      setShowAddNodeDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-[#3192fc] hover:bg-[#3192fc]/10 rounded-lg font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>+ Create Custom Block...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={runPipelineSimulation}
            disabled={isRunning || nodes.length === 0}
            className="bg-[#3192fc] hover:brightness-110 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Pipeline</span>
          </button>
        </div>
      </div>

      {/* Visual Canvas Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* The DAG visual graph builder (Left 2 columns) */}
        <div 
          ref={graphContainerRef}
          id="workflow-graph-container"
          className="lg:col-span-2 bg-[#141416]/40 border border-[#1F1F23] rounded-xl flex flex-col justify-between overflow-hidden p-6 relative"
        >
          <div className="absolute inset-0 bg-dot-pattern pointer-events-none opacity-40"></div>
          
          <div className="text-[10px] font-mono text-[#c0c7d5]/40 uppercase tracking-widest relative z-20 mb-4 flex justify-between items-center w-full">
            <span>Workflow Graph Diagram</span>
            <span>{nodes.length} compiled nodes</span>
          </div>

          {/* Graphical Pipeline Path representation using React Flow */}
          {nodes.length > 0 ? (
            <div className="flex-1 w-full min-h-[320px] relative z-10 overflow-hidden">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onNodeDragStop={onNodeDragStop}
                onEdgesDelete={onEdgesDelete}
                onNodesDelete={onNodesDelete}
                onEdgeDoubleClick={(_, edge) => {
                  if (!isRunning) {
                    onEdgesDelete([edge]);
                  }
                }}
                onPaneClick={onPaneClick}
                onPaneContextMenu={onPaneContextMenu}
                onViewportChange={(viewport) => setZoomLevel(viewport.zoom)}
                fitView
                fitViewOptions={{ padding: 0.15 }}
                minZoom={0.5}
                maxZoom={1.5}
                nodesDraggable={!isRunning}
                nodesConnectable={!isRunning}
                edgesFocusable={!isRunning}
                proOptions={{ hideAttribution: true }}
                className="w-full h-full"
              >
                <Background color="#1F1F23" gap={16} size={1} />
              </ReactFlow>

              {/* Floating Fullscreen Toggle Button - Bottom Right */}
              <button
                onClick={handleToggleFullscreen}
                className="absolute bottom-4 right-4 z-20 p-2.5 rounded-xl border border-[#1F1F23] bg-[#131315]/95 hover:bg-[#353437] text-[#c0c7d5] hover:text-white transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)] active:scale-95 flex items-center justify-center cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 text-center py-10">
              <SlidersHorizontal className="w-12 h-12 text-[#c0c7d5] opacity-30 mb-4 animate-bounce" />
              <p className="text-xs text-[#c0c7d5]">This pipeline is completely empty.</p>
              <button
                onClick={() => setShowAddNodeModal(true)}
                className="mt-3 bg-[#3f495d] text-[#e5e1e4] border border-[#1F1F23] text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#353437] transition-all"
              >
                Add First Node Step
              </button>
            </div>
          )}

          {/* Live scrolling execution logging trace */}
          <div className="mt-auto relative z-10 bg-[#09090b] border border-[#1F1F23] rounded-lg overflow-hidden flex flex-col h-40">
            <div className="bg-[#131315] border-b border-[#1F1F23] px-4 py-2 flex items-center justify-between text-[10px] font-mono uppercase text-[#c0c7d5]/70">
              <span className="flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#3192fc]" />
                <span>Console Log Execution Stream</span>
              </span>
              <button
                onClick={() => setTerminalLogs([])}
                className="hover:text-white"
              >
                Clear logs
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto font-mono text-[10px] space-y-1 bg-[#050505] flex-1">
              {terminalLogs.map((log, index) => {
                let colorClass = 'text-[#c0c7d5]';
                if (log.startsWith('[SYS]')) colorClass = 'text-[#3192fc]';
                else if (log.startsWith('[RUN]')) colorClass = 'text-[#7A5AF8]';
                else if (log.startsWith('[EXEC]')) colorClass = 'text-[#F79009]';
                else if (log.includes('SUCCESS')) colorClass = 'text-[#32D583]';
                else if (log.includes('LOG')) colorClass = 'text-[#c0c7d5]/60';
                
                return (
                  <div key={index} className={colorClass}>
                    {log}
                  </div>
                );
              })}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>

        {/* Selected Node Properties & Code panel (Right column) */}
        <div className="bg-[#131315] border border-[#1F1F23] rounded-xl flex flex-col h-full overflow-hidden">
          {selectedNode ? (
            <div className="flex flex-col h-full justify-between">
              {/* Properties Header */}
              <div className="p-4 border-b border-[#1F1F23] flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-[#e5e1e4] truncate">{selectedNode.name}</h3>
                  <span className="text-[10px] font-mono text-[#c0c7d5] opacity-70">
                    Configuration panel
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  className="p-1 text-[#c0c7d5] hover:text-[#F04438] hover:bg-[#353437] rounded"
                  title="Delete step"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Parameter values config */}
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <div>
                  <h4 className="text-[10px] font-mono text-[#c0c7d5]/50 uppercase tracking-wider mb-2">
                    Runtime details
                  </h4>
                  <div className="bg-[#141416] border border-[#1f1f23] rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#c0c7d5]/70">Type:</span>
                      <span className="font-mono uppercase text-[#3192fc]">{selectedNode.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#c0c7d5]/70">Compute Status:</span>
                      <span className="capitalize">{selectedNode.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#c0c7d5]/70">Description:</span>
                      <span className="text-right max-w-[150px] truncate">{selectedNode.description}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-mono text-[#c0c7d5]/50 uppercase tracking-wider mb-2">
                    {selectedNode.inputs && selectedNode.inputs.length > 0 ? "Input Schema" : "Parameters schema"}
                  </h4>
                  <div className="space-y-3">
                    {selectedNode.inputs && selectedNode.inputs.length > 0 ? (
                      selectedNode.inputs.map((param, index) => (
                        <div key={index}>
                          <label className="text-[11px] text-[#c0c7d5]/70 block mb-1">
                            {param.name} <span className="text-[10px] text-[#3192fc]/80 font-mono">({param.type})</span>
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={`Mapped dynamically`}
                            className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-1.5 text-xs text-[#e5e1e4] focus:outline-none opacity-80 cursor-default font-mono"
                          />
                        </div>
                      ))
                    ) : (
                      getNodeParameters(selectedNode.type).map((param, index) => (
                        <div key={index}>
                          <label className="text-[11px] text-[#c0c7d5]/70 block mb-1">
                            {param.name}
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={param.value}
                            className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-1.5 text-xs text-[#e5e1e4] focus:outline-none opacity-80 cursor-default"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {selectedNode.outputs && selectedNode.outputs.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-mono text-[#c0c7d5]/50 uppercase tracking-wider mb-2">
                      Output Schema
                    </h4>
                    <div className="space-y-2">
                      {selectedNode.outputs.map((out, index) => (
                        <div key={index} className="flex justify-between items-center text-xs p-2 bg-[#050505] border border-[#1F1F23] rounded-lg">
                          <span className="font-mono text-[#e5e1e4]">{out.name}</span>
                          <span className="font-mono text-[10px] text-[#a6c8ff] uppercase">{out.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PyScript view */}
                <div className="flex-1">
                  <h4 className="text-[10px] font-mono text-[#c0c7d5]/50 uppercase tracking-wider mb-2 flex justify-between items-center">
                    <span>Python Executor Script</span>
                    <button 
                      onClick={handleOpenCodeEditor}
                      className="text-[9px] text-[#3192fc] hover:underline cursor-pointer bg-transparent border-none outline-none"
                    >
                      Edit script
                    </button>
                  </h4>
                  <pre className="bg-[#050505] border border-[#1F1F23] rounded-lg p-3 text-[10px] font-mono text-[#32D583]/80 overflow-x-auto overflow-y-auto max-h-48 whitespace-pre">
                    {selectedNode.code || getCodeSnippet(selectedNode.type, selectedNode.name)}
                  </pre>
                </div>
              </div>

              {/* Status footer */}
              <div className="p-4 bg-[#141416] border-t border-[#1F1F23] flex items-center justify-between text-xs text-[#c0c7d5]">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-[#FDB022]" />
                  <span>Configured via YAML</span>
                </div>
                <span className="font-mono text-[10px] bg-[#1F1F23] px-2 py-0.5 rounded text-[#e5e1e4]">
                  gpc-cluster-1
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60">
              <SlidersHorizontal className="w-8 h-8 text-[#c0c7d5] mb-2" />
              <p className="text-xs text-[#c0c7d5]">Select a node step on the DAG layout to customize its parameters and script configurations.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Custom Block Modal Overlay */}
      {showAddNodeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#09090b] border border-[#1F1F23] rounded-xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col my-8">
            {/* Header */}
            <div className="p-5 border-b border-[#1F1F23] flex justify-between items-center bg-[#0d0d10]">
              <h3 className="text-sm font-bold text-[#e5e1e4]">Create custom block</h3>
              <button
                onClick={() => setShowAddNodeModal(false)}
                className="text-[#c0c7d5]/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Row 1: Block Name & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[11px] font-semibold text-[#c0c7d5]/80 block mb-1.5">
                    Block Name
                  </label>
                  <input
                    type="text"
                    value={newNodeName}
                    onChange={(e) => setNewNodeName(e.target.value)}
                    placeholder="custom_transformer_01"
                    className="w-full bg-[#050505] border border-[#1f1f23] rounded-lg px-3.5 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] focus:ring-1 focus:ring-[#3192fc] placeholder:text-[#c0c7d5]/30 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#c0c7d5]/80 block mb-1.5">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={newNodeDescription}
                    onChange={(e) => setNewNodeDescription(e.target.value)}
                    placeholder="Briefly describe this block's function"
                    className="w-full bg-[#050505] border border-[#1f1f23] rounded-lg px-3.5 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] focus:ring-1 focus:ring-[#3192fc] placeholder:text-[#c0c7d5]/30"
                  />
                </div>
              </div>

              {/* Row 2: Input & Output Schemas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Input Schema Card */}
                <div className="border border-[#1F1F23] bg-[#131315]/40 rounded-xl p-5 relative">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-[#e5e1e4] flex items-center space-x-1">
                      <span>Input Schema</span>
                    </h4>
                    <span className="text-[10px] text-[#c0c7d5]/40 font-mono cursor-help" title="Define variables received by def execute(inputs)">
                      [ℹ]
                    </span>
                  </div>

                  <div className="space-y-3">
                    {inputSchema.map((field, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => {
                            const updated = [...inputSchema];
                            updated[idx].name = e.target.value;
                            setInputSchema(updated);
                          }}
                          placeholder="variable_name"
                          className="flex-1 bg-[#050505] border border-[#1f1f23] rounded-lg px-3 py-1.5 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] font-mono"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const updated = [...inputSchema];
                            updated[idx].type = e.target.value;
                            setInputSchema(updated);
                          }}
                          className="bg-[#050505] border border-[#1f1f23] rounded-lg px-3 py-1.5 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] min-w-[100px]"
                        >
                          <option value="DataFrame">DataFrame</option>
                          <option value="Scalar">Scalar</option>
                          <option value="Tensor">Tensor</option>
                          <option value="Model">Model</option>
                          <option value="Dataset">Dataset</option>
                        </select>
                        <button
                          onClick={() => setInputSchema(inputSchema.filter((_, i) => i !== idx))}
                          className="p-1.5 text-[#c0c7d5]/60 hover:text-[#F04438] hover:bg-[#353437]/40 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setInputSchema([...inputSchema, { name: '', type: 'DataFrame' }])}
                    className="text-xs font-semibold text-[#3192fc] hover:underline cursor-pointer flex items-center space-x-1 mt-4"
                  >
                    <span>+ Add field</span>
                  </button>
                </div>

                {/* Output Schema Card */}
                <div className="border border-[#1F1F23] bg-[#131315]/40 rounded-xl p-5 relative">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-[#e5e1e4] flex items-center space-x-1">
                      <span>Output Schema</span>
                    </h4>
                    <span className="text-[10px] text-[#c0c7d5]/40 font-mono cursor-help" title="Define variables outputted by return outputs">
                      [ℹ]
                    </span>
                  </div>

                  <div className="space-y-3">
                    {outputSchema.map((field, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => {
                            const updated = [...outputSchema];
                            updated[idx].name = e.target.value;
                            setOutputSchema(updated);
                          }}
                          placeholder="variable_name"
                          className="flex-1 bg-[#050505] border border-[#1f1f23] rounded-lg px-3 py-1.5 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] font-mono"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const updated = [...outputSchema];
                            updated[idx].type = e.target.value;
                            setOutputSchema(updated);
                          }}
                          className="bg-[#050505] border border-[#1f1f23] rounded-lg px-3 py-1.5 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] min-w-[100px]"
                        >
                          <option value="Tensor">Tensor</option>
                          <option value="DataFrame">DataFrame</option>
                          <option value="Scalar">Scalar</option>
                          <option value="Model">Model</option>
                          <option value="Dataset">Dataset</option>
                        </select>
                        <button
                          onClick={() => setOutputSchema(outputSchema.filter((_, i) => i !== idx))}
                          className="p-1.5 text-[#c0c7d5]/60 hover:text-[#F04438] hover:bg-[#353437]/40 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setOutputSchema([...outputSchema, { name: '', type: 'Tensor' }])}
                    className="text-xs font-semibold text-[#3192fc] hover:underline cursor-pointer flex items-center space-x-1 mt-4"
                  >
                    <span>+ Add field</span>
                  </button>
                </div>
              </div>

              {/* Code Panel */}
              <div className="space-y-2">
                <div className="bg-[#131315] border border-[#1F1F23] rounded-xl overflow-hidden flex flex-col">
                  {/* Code Banner Header */}
                  <div className="bg-[#0d0d10] px-4 py-2 border-b border-[#1F1F23] flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-[#c0c7d5]/60">Python 3.10 <span className="text-[#c0c7d5]/30">main.py</span></span>
                    <div className="flex space-x-3 text-xs text-[#c0c7d5]/50">
                      <span className="cursor-pointer hover:text-white" title="Format code">☰</span>
                      <span className="cursor-pointer hover:text-white" title="Toggle Fullscreen">⛶</span>
                    </div>
                  </div>

                  {/* Code Editor block */}
                  <div className="flex bg-[#050505] overflow-hidden min-h-[160px] max-h-56">
                    <div className="bg-[#09090b] text-[#c0c7d5]/30 font-mono text-[11px] py-3 text-right select-none border-r border-[#1F1F23]/60 w-10 flex flex-col shrink-0 leading-5">
                      {Array.from({ length: Math.max(customBlockCode.split('\n').length, 7) }).map((_, i) => (
                        <span key={i} className="pr-2">{i + 1}</span>
                      ))}
                    </div>
                    <textarea
                      value={customBlockCode}
                      onChange={(e) => setCustomBlockCode(e.target.value)}
                      className="flex-1 bg-transparent text-[#32D583]/90 font-mono text-[11px] p-3 focus:outline-none resize-none leading-5 overflow-y-auto selection:bg-[#3192fc]/30 w-full"
                      spellCheck={false}
                    />
                  </div>
                </div>

                {validationSuccess !== null && (
                  <div className={`p-3 rounded-lg text-xs font-semibold ${
                    validationSuccess ? 'bg-[#32D583]/10 text-[#32D583] border border-[#32D583]/20' : 'bg-[#F04438]/10 text-[#F04438] border border-[#F04438]/20'
                  }`}>
                    {validationSuccess ? '✓ Syntax validation passed. Click Save Block to commit.' : '✗ Validation error: Please check your def execute and return statements.'}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 bg-[#0d0d10] border-t border-[#1F1F23] flex justify-end items-center space-x-3">
              <button
                onClick={handleValidateCode}
                className="bg-transparent hover:bg-[#353437]/40 border border-[#1f1f23] text-[#e5e1e4] px-4 py-2 rounded-lg text-xs font-semibold"
              >
                Validate Code
              </button>
              <button
                onClick={handleAddNode}
                disabled={!newNodeName.trim()}
                className="bg-[#3192fc] hover:brightness-110 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md transition-all"
              >
                Save Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Editor Modal Overlay */}
      {showCodeEditor && selectedNode && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131315] border border-[#1F1F23] rounded-xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-[#1F1F23] flex justify-between items-center bg-[#141416]">
              <div>
                <h3 className="text-sm font-bold text-[#e5e1e4] flex items-center">
                  <Sparkles className="w-4 h-4 text-[#3192fc] mr-1.5" />
                  Python Executor Script Editor - {selectedNode.name}
                </h3>
                <p className="text-[10px] font-mono text-[#c0c7d5]/60 mt-0.5">
                  Type: <span className="uppercase text-[#3192fc]">{selectedNode.type}</span> | Runtime: NVIDIA GPU A100 | Environment: Python 3.10
                </p>
              </div>
              <button
                onClick={() => setShowCodeEditor(false)}
                className="text-[#c0c7d5] hover:text-[#e5e1e4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Editor Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Instructions Sidebar */}
              <div className="w-64 bg-[#141416] border-r border-[#1F1F23] p-4 hidden md:flex flex-col justify-between text-xs text-[#c0c7d5] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-mono text-[#c0c7d5]/40 uppercase tracking-widest mb-1.5">Instructions</h4>
                    <p className="leading-relaxed text-[11px]">
                      This python script executes within a sandboxed Docker container inside the cluster during simulation runs.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-mono text-[#c0c7d5]/40 uppercase tracking-widest mb-1.5">Context Variables</h4>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#c0c7d5]/80">
                      <li><code>ctx.pipeline_id</code>: ID of the running pipeline.</li>
                      <li><code>ctx.get_input()</code>: Fetch upstream dataset or artifacts.</li>
                      <li><code>ctx.log(msg)</code>: Print trace logs to orchestrator console.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-mono text-[#c0c7d5]/40 uppercase tracking-widest mb-1.5">Available Libraries</h4>
                    <div className="flex flex-wrap gap-1">
                      {['numpy', 'pandas', 'scikit-learn', 'xgboost', 'torch', 'requests'].map((lib) => (
                        <span key={lib} className="font-mono text-[9px] bg-[#1F1F23] px-1.5 py-0.5 rounded text-[#a6c8ff]">
                          {lib}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#1F1F23] pt-4 mt-4 text-[10px] font-mono text-[#c0c7d5]/40">
                  Cluster: gpc-stage-node-0
                </div>
              </div>

              {/* Text Area Code Editor */}
              <div className="flex-1 flex flex-col bg-[#050505] relative overflow-hidden">
                {/* Code Editor Title Banner */}
                <div className="bg-[#09090b] border-b border-[#1F1F23]/60 px-4 py-1.5 flex items-center justify-between text-[10px] font-mono text-[#c0c7d5]/50 select-none">
                  <span>main.py</span>
                  <span>UTF-8</span>
                </div>

                {/* Editor Textarea */}
                <textarea
                  value={editingCode}
                  onChange={(e) => setEditingCode(e.target.value)}
                  className="flex-1 bg-transparent text-[#32D583]/90 font-mono text-xs p-5 focus:outline-none resize-none leading-relaxed overflow-y-auto selection:bg-[#3192fc]/30 w-full"
                  spellCheck={false}
                  placeholder="# Write your python script execution code here..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#141416] border-t border-[#1F1F23] flex justify-end space-x-2">
              <button
                onClick={() => setShowCodeEditor(false)}
                className="bg-transparent hover:bg-[#353437] text-[#c0c7d5] px-4 py-2 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCode}
                className="bg-[#3192fc] hover:brightness-110 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-md transition-all flex items-center space-x-1.5"
              >
                <span>Save Python Script</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pane Right-Click Context Menu */}
      {contextMenu && (
        <div
          className="absolute z-50 bg-[#0c0c0e]/95 border border-[#1f1f23] rounded-xl shadow-2xl p-2.5 w-60 backdrop-blur-md transition-all divide-y divide-[#1f1f23]/60 select-none animate-in fade-in zoom-in-95 duration-100"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {NODE_TEMPLATES.map((cat, idx) => (
            <div key={idx} className="py-1.5 first:pt-0 last:pb-0">
              <div className="px-2.5 py-1 text-[9px] font-bold text-[#c0c7d5]/40 uppercase tracking-widest font-mono">
                {cat.category}
              </div>
              {cat.items.map((item, itemIdx) => (
                <button
                  key={itemIdx}
                  onClick={() => {
                    const newId = `node-${Date.now()}`;
                    const newNode: PipelineNode = {
                      id: newId,
                      name: item.name,
                      type: item.type as NodeType,
                      status: 'idle',
                      description: item.description,
                      duration: 'Pending',
                      code: item.code,
                      inputs: item.inputs,
                      outputs: item.outputs,
                      position: { x: contextMenu.flowX, y: contextMenu.flowY }
                    };

                    const newRfNode = {
                      id: newId,
                      type: 'customNode',
                      position: { x: contextMenu.flowX, y: contextMenu.flowY },
                      data: {
                        node: newNode,
                        isRunningNode: false,
                        getNodeIcon,
                        onHandleClick: (e: React.MouseEvent, handleId: string, type: 'source' | 'target') => {
                          onHandleClick(e, newId, handleId, type);
                        }
                      }
                    };

                    const updatedNodes = [...nodes, newRfNode];
                    setNodes(updatedNodes);
                    syncPipelineData(updatedNodes, edges);
                    setContextMenu(null);

                    setTerminalLogs(prev => [
                      ...prev,
                      `[SYS] Added node [${item.name}] to canvas.`
                    ]);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-[#c0c7d5] hover:bg-[#3192fc]/10 hover:text-white rounded-lg transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <span>{item.name}</span>
                  <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#3192fc] transition-opacity" />
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Port Suggestion Menu */}
      {handleMenu && (
        <div
          className="handle-menu-popover absolute z-50 bg-[#0c0c0e]/95 border border-[#1f1f23] rounded-xl shadow-2xl p-2.5 w-60 backdrop-blur-md transition-all select-none animate-in fade-in zoom-in-95 duration-100"
          style={{ left: `${handleMenu.x}px`, top: `${handleMenu.y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-2 pb-1 border-b border-[#1f1f23]">
            <span className="text-[9px] font-bold text-[#c0c7d5]/40 uppercase tracking-widest font-mono">
              Compatible Nodes
            </span>
            <button
              onClick={() => setHandleMenu(null)}
              className="text-[#c0c7d5]/50 hover:text-white cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {(() => {
              const pNode = nodes.find(n => n.id === handleMenu.nodeId);
              if (!pNode) return null;
              const compList = getCompatibleNodesForHandle(pNode.data.node.type, handleMenu.handleId, handleMenu.type);
              
              if (compList.length === 0) {
                return (
                  <div className="text-[11px] text-[#c0c7d5]/40 px-2 py-1 italic">
                    No compatible connections.
                  </div>
                );
              }

              return compList.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => addNodeAndConnect(item.templateName)}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-[#c0c7d5] hover:bg-[#32d583]/10 hover:text-white rounded-lg transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <span>{item.name}</span>
                  <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#32d583] transition-opacity" />
                </button>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
