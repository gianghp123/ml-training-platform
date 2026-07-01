'use client';

import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const normStatus = status.toLowerCase().replace(/[\s_-]+/g, '');

  let bgClass = 'bg-[#353437] text-[#c0c7d5] border border-[#1F1F23]';
  let dotClass = 'bg-[#8a919e]';
  let labelText = status;

  switch (normStatus) {
    case 'success':
    case 'completed':
    case 'active':
    case 'ready':
      bgClass = 'bg-[#32D583]/10 text-[#32D583] border border-[#32D583]/20';
      dotClass = 'bg-[#32D583]';
      labelText = normStatus === 'ready' ? 'READY' : normStatus === 'active' ? 'ACTIVE' : 'Success';
      break;

    case 'error':
    case 'failed':
      bgClass = 'bg-[#F04438]/10 text-[#F04438] border border-[#F04438]/20';
      dotClass = 'bg-[#F04438] animate-pulse';
      labelText = normStatus === 'failed' ? 'FAILED' : 'Error';
      break;

    case 'running':
    case 'syncing':
      bgClass = 'bg-[#3192fc]/10 text-[#3192fc] border border-[#3192fc]/20';
      dotClass = 'bg-[#3192fc] animate-ping';
      labelText = normStatus === 'syncing' ? 'SYNCING' : 'Running';
      break;

    case 'warning':
      bgClass = 'bg-[#FDB022]/10 text-[#FDB022] border border-[#FDB022]/20';
      dotClass = 'bg-[#FDB022]';
      labelText = 'Warning';
      break;

    case 'info':
      bgClass = 'bg-[#3192fc]/10 text-[#3192fc] border border-[#3192fc]/20';
      dotClass = 'bg-[#3192fc]';
      labelText = 'Info';
      break;

    case 'neverrun':
      bgClass = 'bg-[#353437] text-[#c0c7d5] border border-[#1F1F23]';
      dotClass = 'bg-[#8a919e]';
      labelText = 'Never run';
      break;

    case 'idle':
      bgClass = 'bg-[#353437] text-[#c0c7d5] border border-[#1F1F23]';
      dotClass = 'bg-[#8a919e]';
      labelText = 'Idle';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${bgClass} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${dotClass}`}></span>
      <span>{labelText}</span>
    </span>
  );
}
