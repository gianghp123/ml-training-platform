'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { memo, useCallback, useMemo } from 'react';
import { CATEGORY_COLORS } from '../../blocks';
import type { BlockConfigField } from '../../blocks/socket-types';
import { useBuilderContext } from '../../contexts/builder.context';
import type { PipelineNode, PipelineNodeData } from '../../utils/node-factory';
import { findBlockById } from '../../utils/node-factory';
import { BlockConfigForm } from '../BlockConfigForm';

function getStatusVariant(status: PipelineNodeData['status']) {
  switch (status) {
    case 'success':
      return 'default' as const;
    case 'running':
      return 'default' as const;
    case 'queued':
      return 'secondary' as const;
    case 'error':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

function BaseNode({ id, data, selected }: NodeProps<PipelineNode>) {
  const dotColor = CATEGORY_COLORS[data.categoryId] ?? 'bg-gray-500';
  const builder = useBuilderContext();

  const configSchema = useMemo(() => {
    const block = findBlockById(data.blockId);
    return (block?.configSchema ?? {}) as Record<string, BlockConfigField>;
  }, [data.blockId]);

  const handleConfigChange = useCallback(
    (key: string, value: string | number | boolean) => {
      builder.onConfigChange(id, key, value);
    },
    [id, builder]
  );

  const handleStyle = {
    width: 10,
    height: 10,
    border: `2px solid var(--color-background)`,
  };

  return (
    <div
      className={`min-w-50 rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow ${selected ? 'ring-2 ring-ring' : 'ring-1 ring-foreground/10'
        }`}
    >
      <div
        className={`flex items-center gap-2 rounded-t-lg px-3 py-2 ${dotColor} text-white`}
      >
        <span className="text-sm font-medium truncate flex-1">{data.blockName}</span>
        {data.status !== 'idle' && (
          <Badge variant={getStatusVariant(data.status)} className="text-[10px] h-4">
            {data.status}
          </Badge>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            {data.inputs.map((input) => (
              <div key={input.id} className="relative flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Handle
                      type="target"
                      position={Position.Left}
                      id={input.id}
                      style={{
                        ...handleStyle,
                        top: 'auto',
                        bottom: 'auto',
                        left: -5,
                        position: 'absolute',
                        transform: 'none',
                      }}
                      className={`static! ${dotColor} border-2! border-background!`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="left">{input.label} ({input.type})</TooltipContent>
                </Tooltip>
                <span className="text-xs text-muted-foreground">
                  {input.label}
                  {input.optional && <span className="text-[10px]"> (optional)</span>}
                </span>
              </div>
            ))}
          </div>
          <div>
            {data.outputs.map((output) => (
              <div key={output.id} className="relative flex items-center justify-end gap-2">
                <span className="text-xs text-muted-foreground">{output.label}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={output.id}
                      style={{
                        ...handleStyle,
                        top: 'auto',
                        bottom: 'auto',
                        right: -5,
                        position: 'absolute',
                        transform: 'none',
                      }}
                      className={`static! ${dotColor} border-2! border-background!`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="right">{output.label} ({output.type})</TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>

        <BlockConfigForm
          schema={configSchema}
          values={data.config}
          onChange={handleConfigChange}
        />
      </div>
    </div>
  );
}

export default memo(BaseNode);
