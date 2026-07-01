'use client';

import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function EmptyState({ message, icon: Icon = SlidersHorizontal }: EmptyStateProps) {
  return (
    <div className="p-8 text-center text-[#c0c7d5]/50 flex flex-col items-center justify-center space-y-3 py-12">
      <Icon className="w-10 h-10 text-[#c0c7d5]/20 animate-pulse" />
      <p className="text-xs font-medium font-mono">{message}</p>
    </div>
  );
}
