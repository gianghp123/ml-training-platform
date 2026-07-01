'use client';

import { Code, Sparkles } from 'lucide-react';
import PageHeader from '../shared/PageHeader';
import { Card } from '@/components/ui/card';

export default function DocumentationScreen() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header Component */}
      <PageHeader 
        title="Orchestration Documentation" 
        description="Tutorials, APIs, and guides to model design and automation." 
      />

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Getting started card */}
        <Card className="bg-[#131315] border border-[#1F1F23] rounded-xl p-5 space-y-3 shadow-none">
          <div className="p-2 bg-[#3192fc]/10 rounded-lg border border-[#3192fc]/20 text-[#3192fc] w-fit">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#e5e1e4]">Designing DAG Workflows</h3>
          <p className="text-xs text-[#c0c7d5] leading-relaxed">
            A pipeline in Pipeline Studio is structured as a Directed Acyclic Graph (DAG) consisting of independent execution tasks called Nodes.
          </p>
          <ul className="text-xs text-[#c0c7d5]/80 space-y-1.5 list-disc pl-4">
            <li><strong>Ingestion:</strong> Pulls from cloud storage databases (GCS/BQ).</li>
            <li><strong>Preprocessing:</strong> Resolves feature weights and standard scales.</li>
            <li><strong>Training:</strong> Leverages GPU nodes to fit mathematical weights.</li>
          </ul>
        </Card>

        {/* Scripting API card */}
        <Card className="bg-[#131315] border border-[#1F1F23] rounded-xl p-5 space-y-3 shadow-none">
          <div className="p-2 bg-[#7A5AF8]/10 rounded-lg border border-[#7A5AF8]/20 text-[#7A5AF8] w-fit">
            <Code className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#e5e1e4]">Writing Script Executions</h3>
          <p className="text-xs text-[#c0c7d5] leading-relaxed">
            Every step supports self-contained Python execution scripts that receive parameters from upstream blocks and serialize outputs back.
          </p>
          <pre className="bg-[#050505] p-3 rounded-lg border border-[#1F1F23] text-[9px] font-mono text-[#32D583]/90">
{`# Upstream dataset input is injected via global ctx
import numpy as np

def step_exec(ctx):
    raw_df = ctx.get_input_dataset()
    print("Normalizing features...")
    return raw_df.values * np.pi`}
          </pre>
        </Card>
      </div>
    </div>
  );
}
