'use client';

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { memo } from 'react';
import { X } from 'lucide-react';

interface PipelineEdgeData {
  color?: string;
  edgeStyle?: 'smoothstep' | 'bezier' | 'straight';
  suspended?: boolean;
}

function PipelineEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style, data, selected }: EdgeProps) {
  const { setEdges } = useReactFlow();
  const edgeData = data as PipelineEdgeData | undefined;
  const edgeColor = edgeData?.color ?? '#6b7280';
  const edgeStyle = edgeData?.edgeStyle ?? 'smoothstep';

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  switch (edgeStyle) {
    case 'bezier':
      [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
      break;
    case 'straight':
      [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
      break;
    default:
      [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
      break;
  }

  const isSuspended = edgeData?.suspended === true;

  const onEdgeClick = (evt: React.MouseEvent<HTMLButtonElement>) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((e) => e.id !== id));
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#ffffff' : edgeColor,
          strokeWidth: selected ? 8 : (isSuspended ? 1 : 6),
        }}
        className={isSuspended ? "animated-dash" : ""}
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              className="bg-destructive hover:bg-destructive/90 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110"
              onClick={onEdgeClick}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(PipelineEdge);
