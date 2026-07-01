'use client';

import React from 'react';
import { OrchestratorProvider } from '@/context/orchestrator-context';
import SideNavBar from '@/components/layout/SideNavBar';
import TopAppBar from '@/components/layout/TopAppBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrchestratorProvider>
      <DashboardInnerLayout>{children}</DashboardInnerLayout>
    </OrchestratorProvider>
  );
}

function DashboardInnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#09090B] text-[#e5e1e4]">
      {/* Sidebar Navigation */}
      <SideNavBar />

      {/* Primary Content Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header App Bar */}
        <TopAppBar />

        {/* Main Canvas Area */}
        <main className="flex-1 overflow-y-auto bg-[#09090B] bg-dot-pattern p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
