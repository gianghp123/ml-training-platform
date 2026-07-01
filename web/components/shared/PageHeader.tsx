'use client';

import React from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  const ActionIcon = action?.icon;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-[#e5e1e4] tracking-tight">{title}</h2>
        <p className="text-xs text-[#c0c7d5] mt-1">{description}</p>
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="bg-[#3192fc] hover:brightness-110 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-md self-start md:self-auto cursor-pointer"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}
