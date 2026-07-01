'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: string | number;
  accentColor?: 'green' | 'orange' | 'purple' | 'blue' | 'red' | 'gray';
  icon?: React.ComponentType<{ className?: string }>;
  indicator?: {
    type: 'success' | 'warning' | 'error' | 'info' | 'default';
    text: string;
    icon?: string; // 'up' | 'down' | 'dot'
  };
}

export default function StatCard({ label, value, accentColor = 'blue', icon: Icon, indicator }: StatCardProps) {
  let borderAccentClass = 'bg-[#3192fc]';
  switch (accentColor) {
    case 'green':
      borderAccentClass = 'bg-[#32D583]';
      break;
    case 'orange':
      borderAccentClass = 'bg-[#FDB022]';
      break;
    case 'purple':
      borderAccentClass = 'bg-[#7A5AF8]';
      break;
    case 'blue':
      borderAccentClass = 'bg-[#3192fc]';
      break;
    case 'red':
      borderAccentClass = 'bg-[#F04438]';
      break;
    case 'gray':
      borderAccentClass = 'bg-[#1F1F23]';
      break;
  }

  let indicatorTextClass = 'text-[#c0c7d5]/60';
  if (indicator) {
    switch (indicator.type) {
      case 'success':
        indicatorTextClass = 'text-[#32D583]';
        break;
      case 'warning':
        indicatorTextClass = 'text-[#FDB022]';
        break;
      case 'error':
        indicatorTextClass = 'text-[#F04438]';
        break;
      case 'info':
        indicatorTextClass = 'text-[#3192fc]';
        break;
    }
  }

  return (
    <Card className="bg-[#141416] border border-[#1F1F23] rounded-xl p-4 flex items-center justify-between relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-[3px] ${borderAccentClass}`} />
      
      <div className="flex-1 min-w-0">
        <span className="text-[10px] uppercase font-bold tracking-widest text-[#c0c7d5]/60 block truncate">{label}</span>
        <span className="text-2xl font-bold text-[#e5e1e4] block mt-1 truncate">{value}</span>
        
        {indicator && (
          <span className={`text-[10px] flex items-center mt-0.5 font-medium ${indicatorTextClass}`}>
            {indicator.icon === 'up' && <span className="mr-1">↗</span>}
            {indicator.icon === 'down' && <span className="mr-1">↘</span>}
            {indicator.icon === 'dot' && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />}
            {indicator.text}
          </span>
        )}
      </div>

      {Icon && (
        <div className="ml-4 shrink-0">
          <Icon className="w-8 h-8 text-[#c0c7d5]/20" />
        </div>
      )}
    </Card>
  );
}
