'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  Play,
  Save,
  Settings2,
} from 'lucide-react';

interface WorkflowToolbarProps {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  onSave: () => void;
  onRun: () => void;
  hasSavedWorkflow: boolean;
  onLoad: () => void;
  edgeStyle: string;
  onEdgeStyleChange: (style: 'smoothstep' | 'bezier' | 'straight') => void;
}

export function WorkflowToolbar({
  workflowName,
  onWorkflowNameChange,
  onSave,
  onRun,
  hasSavedWorkflow,
  onLoad,
  edgeStyle,
  onEdgeStyleChange,
}: WorkflowToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b bg-background">
      <Input
        value={workflowName}
        onChange={(e) => onWorkflowNameChange(e.target.value)}
        className="h-8 w-48 text-sm font-medium"
        placeholder="Workflow name"
      />

      <div className="flex-1" />

      <Select value={edgeStyle} onValueChange={(v) => onEdgeStyleChange(v as 'smoothstep' | 'bezier' | 'straight')}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <Settings2 className="size-3.5 mr-1" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="smoothstep">Smooth Step</SelectItem>
          <SelectItem value="bezier">Bezier</SelectItem>
          <SelectItem value="straight">Straight</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        {hasSavedWorkflow && (
          <Button variant="ghost" size="icon-sm" onClick={onLoad} title="Load workflow">
            <Download className="size-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" onClick={onSave} title="Save workflow">
          <Save className="size-4" />
        </Button>
        <Button variant="default" size="sm" onClick={onRun} className="gap-1.5">
          <Play className="size-3.5" />
          Run
        </Button>
      </div>
    </div>
  );
}
