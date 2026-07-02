'use client';

import {
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';
import { memo } from 'react';

interface PipelineEdgeData {
  color?: string;
  edgeStyle?: 'smoothstep' | 'bezier' | 'straight';
}

function PipelineEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style, data }: EdgeProps) {
  const edgeData = data as PipelineEdgeData | undefined;
  const edgeColor = edgeData?.color ?? '#6b7280';
  const edgeStyle = edgeData?.edgeStyle ?? 'smoothstep';

  let edgePath: string;
  switch (edgeStyle) {
    case 'bezier':
      [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
      break;
    case 'straight':
      [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
      break;
    default:
      [edgePath] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
      break;
  }

  return (
    <path
      id={id}
      d={edgePath}
      fill="none"
      stroke={edgeColor}
      markerEnd={markerEnd}
      style={style}
    />
  );
}

export default memo(PipelineEdge);
