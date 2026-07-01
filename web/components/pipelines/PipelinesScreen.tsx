'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrchestrator } from '@/context/orchestrator-context';
import { 
  Plus, 
  Workflow
} from 'lucide-react';
import PageHeader from '../shared/PageHeader';
import PipelineCard from '../shared/PipelineCard';
import EmptyState from '../shared/EmptyState';

export default function PipelinesScreen() {
  const router = useRouter();
  const { pipelines, searchQuery, createPipeline, deletePipeline } = useOrchestrator();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeCardMenu, setActiveCardMenu] = useState<string | null>(null);

  // Filter pipelines
  const filteredPipelines = pipelines.filter((pipeline) => {
    const matchesSearch = pipeline.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          pipeline.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'success') return matchesSearch && pipeline.status === 'success';
    if (statusFilter === 'error') return matchesSearch && pipeline.status === 'error';
    if (statusFilter === 'never_run') return matchesSearch && pipeline.status === 'never_run';
    if (statusFilter === 'running') return matchesSearch && pipeline.status === 'running';
    return matchesSearch;
  });

  const handleCreatePipeline = () => {
    const newPipeline = createPipeline();
    router.push(`/pipelines/${newPipeline.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Title Header Layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title="Pipeline Directory" 
          description="Configure, design, and run independent workflow DAGs." 
        />

        <div className="flex items-center space-x-2">
          {/* Status Filters */}
          <div className="flex items-center space-x-2 bg-[#131315] border border-[#1F1F23] p-1 rounded-lg">
            {['all', 'success', 'error', 'running', 'never_run'].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all duration-150 cursor-pointer ${
                  statusFilter === f
                    ? 'bg-[#3f495d] text-[#e5e1e4]'
                    : 'text-[#c0c7d5] hover:text-[#e5e1e4] hover:bg-[#353437]'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={handleCreatePipeline}
            className="bg-[#3192fc] hover:brightness-110 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Pipeline</span>
          </button>
        </div>
      </div>

      {/* Grid of cards */}
      {filteredPipelines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPipelines.map((pipeline) => (
            <PipelineCard 
              key={pipeline.id}
              pipeline={pipeline}
              onClick={() => {
                if (pipeline.status === 'success') {
                  router.push(`/pipelines/${pipeline.id}/results`);
                } else {
                  router.push(`/pipelines/${pipeline.id}`);
                }
              }}
              onOpenStudio={() => {
                router.push(`/pipelines/${pipeline.id}`);
                setActiveCardMenu(null);
              }}
              onViewResults={() => {
                router.push(`/pipelines/${pipeline.id}/results`);
                setActiveCardMenu(null);
              }}
              onDelete={() => {
                deletePipeline(pipeline.id);
                setActiveCardMenu(null);
              }}
              isActiveMenu={activeCardMenu === pipeline.id}
              onToggleMenu={() => setActiveCardMenu(activeCardMenu === pipeline.id ? null : pipeline.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-[#1F1F23] rounded-xl bg-[#141416]/20 p-8 text-center">
          <EmptyState 
            message="No matching pipelines found in directory."
            icon={Workflow}
          />
          <button
            onClick={handleCreatePipeline}
            className="mt-4 bg-[#3f495d] text-[#e5e1e4] border border-[#1F1F23] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#353437] transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Pipeline</span>
          </button>
        </div>
      )}
    </div>
  );
}
