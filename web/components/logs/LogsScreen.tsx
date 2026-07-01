'use client';

import { useState } from 'react';
import { useOrchestrator } from '@/context/orchestrator-context';
import { 
  Terminal, 
  Trash2, 
  Search, 
  Copy, 
  Pause, 
  Play, 
  SlidersHorizontal
} from 'lucide-react';
import PageHeader from '../shared/PageHeader';
import StatusBadge from '../shared/StatusBadge';
import EmptyState from '../shared/EmptyState';

export default function LogsScreen() {
  const { logs, clearLogs, pipelines } = useOrchestrator();

  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [selectedPipelineFilter, setSelectedPipelineFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesSearch = log.message.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          log.source.toLowerCase().includes(searchFilter.toLowerCase());
    
    // Pipeline match
    let matchesPipeline = true;
    if (selectedPipelineFilter === 'system') {
      matchesPipeline = !log.pipelineId;
    } else if (selectedPipelineFilter !== 'all') {
      matchesPipeline = log.pipelineId === selectedPipelineFilter;
    }

    return matchesLevel && matchesSearch && matchesPipeline;
  });

  const handleCopyLog = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-[#32D583]';
      case 'warning':
        return 'text-[#FDB022]';
      case 'error':
        return 'text-[#F04438]';
      case 'info':
      default:
        return 'text-[#3192fc]';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Page Header Layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title="System Logs Console" 
          description="Real-time telemetry and process diagnostic logging logs." 
        />

        {/* Console Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-lg border border-[#1F1F23] text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              isPaused 
                ? 'bg-[#3192fc]/10 text-[#3192fc] border-[#3192fc]/30' 
                : 'bg-[#131315] hover:bg-[#353437] text-[#e5e1e4]'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume Sync' : 'Pause Stream'}</span>
          </button>

          <button
            onClick={clearLogs}
            className="bg-[#131315] border border-[#1F1F23] hover:bg-[#353437] text-[#c0c7d5] hover:text-[#e5e1e4] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Terminal</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#131315] border border-[#1F1F23] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        
        {/* Severity Filters */}
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="w-4 h-4 text-[#c0c7d5]/60 mr-1" />
          {['all', 'info', 'success', 'warning', 'error'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all duration-150 cursor-pointer ${
                levelFilter === lvl
                  ? 'bg-[#3f495d] text-[#e5e1e4]'
                  : 'text-[#c0c7d5] hover:text-[#e5e1e4] hover:bg-[#353437]'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Pipeline Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-[#c0c7d5]/60 font-semibold uppercase tracking-wider">Pipeline:</span>
          <select
            value={selectedPipelineFilter}
            onChange={(e) => setSelectedPipelineFilter(e.target.value)}
            className="bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-1.5 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] cursor-pointer"
          >
            <option value="all">All Logs</option>
            <option value="system">System / Engine Logs</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Console Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c0c7d5]/60 w-3.5 h-3.5" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search terminal log content..."
            className="bg-[#050505] border border-[#1F1F23] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] w-64 placeholder:text-[#c0c7d5]/40"
          />
        </div>
      </div>

      {/* Terminal Block */}
      <div className="bg-[#050505] border border-[#1F1F23] rounded-xl overflow-hidden flex flex-col flex-1 h-[450px]">
        {/* Terminal Header */}
        <div className="bg-[#131315] px-4 py-2 border-b border-[#1F1F23] flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-[#F04438]/70 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#FDB022]/70 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#32D583]/70 inline-block"></span>
          </div>
          <div className="text-[10px] font-mono text-[#c0c7d5]/40 uppercase tracking-widest pl-2">
            SSH Session: orchestrator@gpc-cluster-node-0
          </div>
        </div>

        {/* Logs Output */}
        <div className="p-4 overflow-y-auto font-mono text-xs space-y-2 flex-1 scrollbar-thin">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log, index) => {
              const logString = `[${log.timestamp}] [${log.source.toUpperCase()}] [${log.level.toUpperCase()}]: ${log.message}`;
              return (
                <div
                  key={log.id}
                  className="flex items-start justify-between py-1 px-2 rounded hover:bg-[#131315]/80 transition-colors group"
                >
                  <div className="flex items-start space-x-2.5">
                    <span className="mt-0.5 shrink-0">
                      <StatusBadge status={log.level} />
                    </span>
                    <div>
                      <span className="text-[#c0c7d5]/40 text-[10px] mr-2">[{log.timestamp}]</span>
                      <span className="text-[#3192fc] font-semibold text-[10px] mr-2">[{log.source.toUpperCase()}]</span>
                      <span className={`break-all ${getLevelColor(log.level)}`}>
                        {log.message}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyLog(logString, index)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#c0c7d5]/60 hover:text-white hover:bg-[#353437] transition-all ml-4 shrink-0 cursor-pointer"
                    title="Copy full trace"
                  >
                    {copiedIndex === index ? (
                      <span className="text-[9px] text-[#32D583]">Copied!</span>
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[#c0c7d5]/30">
              <EmptyState 
                message="Console is quiet. No matching log traces stream found."
                icon={Terminal}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
