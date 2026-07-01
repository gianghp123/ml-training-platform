'use client';

import React, { use } from 'react';
import { useOrchestrator } from '@/context/orchestrator-context';
import PipelineStudioScreen from '@/components/pipelines/PipelineStudioScreen';
import Link from 'next/link';

export default function PipelineStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { pipelines } = useOrchestrator();
  const pipeline = pipelines.find((p) => p.id === id);

  if (!pipeline) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <h2 className="text-lg font-bold text-[#e5e1e4] mb-2">Pipeline Not Found</h2>
        <p className="text-xs text-[#c0c7d5] mb-4">The pipeline you are looking for does not exist or has been deleted.</p>
        <Link href="/" className="bg-[#3192fc] text-white text-xs font-semibold px-4 py-2 rounded-lg">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return <PipelineStudioScreen pipeline={pipeline} />;
}
