'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { memo, useCallback, useMemo } from 'react';
import { getCategoryColor } from '../../blocks';
import { useBuilderContext } from '../../contexts/builder.context';
import type { PipelineNode } from '../../utils/node-factory';
import { useValidationContext } from '../../contexts/validation.context';
import { BlockConfigForm } from '../BlockConfigForm';

function getStatusVariant(status: PipelineNode['data']['status']) {
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

function BaseNode({ id, data, selected, parentId }: NodeProps<PipelineNode>) {
  const dotColor = getCategoryColor(data.categoryId).tw;
  const builder = useBuilderContext();
  const rf = useReactFlow();

  const isParentSuspended = useMemo(() => {
    if (!parentId) return false;
    const parentNode = rf.getNode(parentId);
    if (!parentNode) return false;
    const pd = parentNode.data as Record<string, unknown>;
    if (pd._group !== true) return false;
    return pd.suspended === true;
  }, [parentId, rf]);

  const { getNodeErrors } = useValidationContext();
  const errors = getNodeErrors(id);
  const hasErrors = errors.length > 0;

  const configFields = useMemo(() => {
    return data.block.configSchema.fields ?? [];
  }, [data.block]);

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
      className={`min-w-50 rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow ${
          hasErrors ? 'ring-2 ring-destructive' : selected ? 'ring-2 ring-ring' : 'ring-1 ring-foreground/10'
        } ${isParentSuspended ? 'opacity-50 grayscale' : ''}`}
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
                  <TooltipContent side="left">{input.id} ({input.artifact})</TooltipContent>
                </Tooltip>
                <span className="text-xs text-muted-foreground">{input.id}</span>
              </div>
            ))}
          </div>
          <div>
            {data.outputs.map((output) => (
              <div key={output.id} className="relative flex items-center justify-end gap-2">
                <span className="text-xs text-muted-foreground">{output.id}</span>
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
                  <TooltipContent side="right">{output.id} ({output.artifact})</TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>

        <BlockConfigForm
          fields={configFields}
          values={data.config}
          onChange={handleConfigChange}
        />

        {hasErrors && (
          <div className="space-y-1 mt-2">
            {errors.map((err, i) => (
              <p key={i} className="text-xs text-destructive">
                {err.message}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(BaseNode);
