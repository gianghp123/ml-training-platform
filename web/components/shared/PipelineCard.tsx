'use client';

import React from 'react';
import { Pipeline, PipelineStatus } from '../../types';
import { 
  Play, 
  Trash2, 
  MoreVertical, 
  ArrowUpRight,
  SlidersHorizontal
} from 'lucide-react';
import StatusBadge from './StatusBadge';

interface PipelineCardProps {
  pipeline: Pipeline;
  onClick: () => void;
  onOpenStudio: () => void;
  onViewResults: () => void;
  onDelete: () => void;
  isActiveMenu: boolean;
  onToggleMenu: () => void;
}

export default function PipelineCard({
  pipeline,
  onClick,
  onOpenStudio,
  onViewResults,
  onDelete,
  isActiveMenu,
  onToggleMenu
}: PipelineCardProps) {

  const getStatusIndicatorBar = (status: PipelineStatus) => {
    switch (status) {
      case 'success':
        return 'bg-[#32D583]/80';
      case 'error':
        return 'bg-[#F04438]/80';
      case 'running':
        return 'bg-[#3192fc]/80';
      case 'never_run':
      default:
        return 'bg-[#353437]';
    }
  };

  const getPipelineIcon = (name: string) => {
    const norm = name.toLowerCase();
    if (norm.includes('fraud')) {
      return 'hub';
    } else if (norm.includes('nlp') || norm.includes('transform')) {
      return 'model_training';
    } else {
      return 'route';
    }
  };

  const iconName = getPipelineIcon(pipeline.name);

  return (
    <div className="bg-[#141416] border border-[#1F1F23] rounded-xl p-4 hover:border-[#404753] transition-colors group relative overflow-hidden flex flex-col justify-between min-h-[160px]">
      <div className={`absolute top-0 left-0 w-full h-[3px] ${getStatusIndicatorBar(pipeline.status)}`} />

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-3">
          <div 
            onClick={onClick}
            className="w-10 h-10 rounded-lg bg-[#353437] flex items-center justify-center border border-[#1F1F23] group-hover:border-[#3192fc]/50 transition-colors cursor-pointer text-sm font-mono text-[#a6c8ff]"
          >
            {iconName === 'hub' ? '⚛' : iconName === 'model_training' ? '⚙' : '☍'}
          </div>
          <div>
            <h3 
              onClick={onClick}
              className="text-sm font-bold text-[#e5e1e4] group-hover:text-[#a6c8ff] transition-colors cursor-pointer flex items-center"
            >
              {pipeline.name}
              <ArrowUpRight className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-[11px] font-mono text-[#c0c7d5] opacity-70 mt-0.5">
              {pipeline.updatedTime}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-[#c0c7d5] opacity-80 line-clamp-2 mb-3">
        {pipeline.description || "No description set. Click to open and customize."}
      </p>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#1F1F23]/40">
        <div className="flex space-x-2">
          <StatusBadge status={pipeline.status} />
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-[#353437] text-[#c0c7d5] border border-[#1F1F23]">
            {pipeline.nodeCount} steps
          </span>
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
            className="text-[#c0c7d5] hover:text-[#e5e1e4] p-1 rounded hover:bg-[#353437] transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isActiveMenu && (
            <div className="absolute right-0 bottom-full mb-1 w-44 bg-[#131315] border border-[#1F1F23] rounded-lg shadow-xl py-1 z-40 text-xs">
              {pipeline.status === 'success' && (
                <button
                  onClick={() => {
                    onViewResults();
                  }}
                  className="w-full text-left px-3 py-2 text-[#32D583] hover:bg-[#353437] flex items-center space-x-2 border-b border-[#1F1F23]/60 font-semibold cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#32D583]" />
                  <span>View Results</span>
                </button>
              )}
              <button
                onClick={() => {
                  onOpenStudio();
                }}
                className="w-full text-left px-3 py-2 text-[#e5e1e4] hover:bg-[#353437] flex items-center space-x-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-[#a6c8ff]" />
                <span>Open Studio</span>
              </button>
              <button
                onClick={() => {
                  onDelete();
                }}
                className="w-full text-left px-3 py-2 text-[#F04438] hover:bg-[#353437] flex items-center space-x-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Pipeline</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
