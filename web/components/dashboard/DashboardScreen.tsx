'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrchestrator } from '@/context/orchestrator-context';
import { 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity,
  ArrowRight,
  Sparkles,
  Database,
  Brain,
  Plus
} from 'lucide-react';
import StatCard from '../shared/StatCard';
import PipelineCard from '../shared/PipelineCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardScreen() {
  const router = useRouter();
  const { pipelines, datasets, models, searchQuery, createPipeline, deletePipeline } = useOrchestrator();

  const [activeCardMenu, setActiveCardMenu] = useState<string | null>(null);

  // Compute stats
  const totalPipelines = pipelines.length;
  const runningCount = pipelines.filter(p => p.status === 'running').length;
  const successCount = pipelines.filter(p => p.status === 'success').length;
  const errorCount = pipelines.filter(p => p.status === 'error').length;
  const successRate = totalPipelines > 0 ? Math.round((successCount / (totalPipelines - pipelines.filter(p => p.status === 'never_run').length || 1)) * 100) : 0;

  // Recent 3 pipelines matching search
  const filteredPipelines = pipelines.filter((pipeline) => {
    return pipeline.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           pipeline.description.toLowerCase().includes(searchQuery.toLowerCase());
  }).slice(0, 3);

  const handleCreatePipeline = () => {
    const newPipeline = createPipeline();
    router.push(`/pipelines/${newPipeline.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Banner using StatCard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Active Pipelines" 
          value={totalPipelines} 
          accentColor="blue"
          icon={Activity}
          indicator={{
            type: 'success',
            text: `${runningCount} executing now`,
            icon: 'dot'
          }}
        />

        <StatCard 
          label="Success Rate" 
          value={`${successRate}%`} 
          accentColor="green"
          icon={CheckCircle2}
          indicator={{
            type: 'default',
            text: `${successCount} / ${totalPipelines - pipelines.filter(p => p.status === 'never_run').length} runs success`
          }}
        />

        <StatCard 
          label="Cluster Load" 
          value="42.8%" 
          accentColor="orange"
          icon={Cpu}
          indicator={{
            type: 'warning',
            text: 'Response time ~14ms',
            icon: 'dot'
          }}
        />

        <StatCard 
          label="Total Failures" 
          value={errorCount} 
          accentColor="red"
          icon={XCircle}
          indicator={{
            type: 'error',
            text: 'Requires immediate debug'
          }}
        />
      </div>

      {/* Main Grid: Left Column for Recent Pipelines, Right Column for Datasets & Models preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pipelines Section (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#e5e1e4] tracking-tight">Recent Pipelines</h2>
              <p className="text-xs text-[#c0c7d5] mt-0.5">Quick access to recently configured machine learning workflows.</p>
            </div>
            
            <Button
              variant="link"
              onClick={() => router.push('/pipelines')}
              className="text-xs font-semibold text-[#3192fc] hover:underline flex items-center space-x-1 h-auto p-0 cursor-pointer"
            >
              <span>All Pipelines</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          {filteredPipelines.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex flex-col items-center justify-center h-52 border border-dashed border-[#1F1F23] rounded-xl bg-[#141416]/20 p-6 text-center">
              <p className="text-xs text-[#c0c7d5] mb-3">No pipelines configured.</p>
              <Button
                variant="outline"
                onClick={handleCreatePipeline}
                className="bg-[#3f495d] text-[#e5e1e4] border border-[#1F1F23] px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#353437] hover:text-[#e5e1e4] transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Template Pipeline</span>
              </Button>
            </div>
          )}
        </div>

        {/* Resources Preview Panel (Right Column) */}
        <div className="space-y-4">
          {/* Datasets card */}
          <Card className="bg-[#131315] border border-[#1F1F23] rounded-xl p-4 flex flex-col justify-between min-h-[170px]">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#e5e1e4] flex items-center">
                  <Database className="w-4 h-4 text-[#a6c8ff] mr-2" />
                  Dataset Catalog
                </h3>
                <p className="text-[11px] text-[#c0c7d5] opacity-70 mt-0.5">Active data inputs stored.</p>
              </div>
              <span className="font-mono text-xs bg-[#1F1F23] text-[#a6c8ff] px-2 py-0.5 rounded font-bold">
                {datasets.length} assets
              </span>
            </div>

            <div className="space-y-2 my-2">
              {datasets.slice(0, 2).map((d) => (
                <div key={d.id} className="flex justify-between items-center text-xs p-2 bg-[#141416] border border-[#1F1F23]/60 rounded-lg">
                  <span className="truncate font-medium text-[#e5e1e4] max-w-[120px]">{d.name}</span>
                  <span className="font-mono text-[10px] text-[#c0c7d5]/60">{d.size}</span>
                </div>
              ))}
            </div>

            <Button
              variant="link"
              onClick={() => router.push('/datasets')}
              className="text-left text-xs font-semibold text-[#3192fc] hover:underline flex items-center space-x-1 h-auto p-0 mt-2 pt-2 border-t border-[#1F1F23]/40 w-full rounded-none justify-start cursor-pointer"
            >
              <span>Manage Datasets</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Card>

          {/* Models card */}
          <Card className="bg-[#131315] border border-[#1F1F23] rounded-xl p-4 flex flex-col justify-between min-h-[170px]">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#e5e1e4] flex items-center">
                  <Brain className="w-4 h-4 text-[#7A5AF8] mr-2" />
                  Model Registry
                </h3>
                <p className="text-[11px] text-[#c0c7d5] opacity-70 mt-0.5">Active neural architectures.</p>
              </div>
              <span className="font-mono text-xs bg-[#1F1F23] text-[#7A5AF8] px-2 py-0.5 rounded font-bold">
                {models.length} active
              </span>
            </div>

            <div className="space-y-2 my-2">
              {models.slice(0, 2).map((m) => (
                <div key={m.id} className="flex justify-between items-center text-xs p-2 bg-[#141416] border border-[#1F1F23]/60 rounded-lg">
                  <span className="truncate font-medium text-[#e5e1e4] max-w-[120px]">{m.name}</span>
                  <span className="font-mono text-[10px] text-[#32D583]">{(m.accuracy * 100).toFixed(1)}% acc</span>
                </div>
              ))}
            </div>

            <Button
              variant="link"
              onClick={() => router.push('/models')}
              className="text-left text-xs font-semibold text-[#3192fc] hover:underline flex items-center space-x-1 h-auto p-0 mt-2 pt-2 border-t border-[#1F1F23]/40 w-full rounded-none justify-start cursor-pointer"
            >
              <span>Manage Models</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Card>
        </div>
      </div>

      {/* Prompt Card: Dynamic Prompt generator */}
      <Card className="bg-gradient-to-r from-[#141416] via-[#1c1c1f] to-[#141416] border border-[#1F1F23] rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-[#3192fc]/5 blur-3xl"></div>
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-[#3192fc]/10 rounded-xl border border-[#3192fc]/20 text-[#3192fc] shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#e5e1e4] flex items-center">
              Generate Pipelines with AI
            </h4>
            <p className="text-xs text-[#c0c7d5] mt-1 max-w-xl">
              Type natural language like <em>"Create an image classification training pipeline with mobilenet on dataset_cats_dogs.parquet"</em> to scaffold a directed acyclic graph (DAG) structure.
            </p>
          </div>
        </div>
        <Button
          onClick={handleCreatePipeline}
          className="bg-[#3192fc] hover:bg-[#3192fc]/90 hover:text-white text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-2 shrink-0 shadow-lg active:scale-95 transition-all self-end md:self-auto cursor-pointer"
        >
          <span>Try AI Generator</span>
        </Button>
      </Card>
    </div>
  );
}
