'use client';

import { NodeResizer, type NodeProps, type Node } from '@xyflow/react';
import { memo } from 'react';

function GroupNode({ data, selected }: NodeProps<Node>) {
  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected}
      />
      <div style={{ width: '100%', height: '100%' }}>
        <div style={{
          padding: '4px 8px',
          fontSize: 12,
          fontWeight: 500,
          background: 'rgba(100, 100, 255, 0.15)',
          borderBottom: '1px solid rgba(100, 100, 255, 0.2)',
        }}>
          {(data as Record<string, unknown>).label as string}
        </div>
      </div>
    </>
  );
}

export default memo(GroupNode);
