'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Workflow, 
  Database, 
  Brain, 
  Terminal, 
  Settings, 
  BookOpen 
} from 'lucide-react';

export default function SideNavBar() {
  const pathname = usePathname();
  
  // Extract primary segment to determine active tab (e.g. "/pipelines/pipe-1" -> "pipelines")
  const primarySegment = pathname.split('/')[1] || '';
  const activeTab = primarySegment === '' ? 'dashboard' : primarySegment;

  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { id: 'pipelines', label: 'Pipelines', icon: Workflow, href: '/pipelines' },
    { id: 'datasets', label: 'Datasets', icon: Database, href: '/datasets' },
    { id: 'models', label: 'Models', icon: Brain, href: '/models' },
    { id: 'logs', label: 'Logs', icon: Terminal, href: '/logs' },
  ];

  const footerNavItems = [
    { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
    { id: 'documentation', label: 'Documentation', icon: BookOpen, href: '/documentation' },
  ];

  return (
    <aside className="bg-[#131315] w-[240px] h-screen sticky left-0 top-0 border-r border-[#1F1F23] flex flex-col p-4 space-y-2 z-40 shrink-0">
      {/* Brand Header */}
      <div className="mb-6 px-2 pt-2">
        <h1 className="text-lg font-bold text-[#e5e1e4] tracking-tight">ML Orchestrator</h1>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center px-3 py-2 rounded-lg font-medium text-sm transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'bg-[#3f495d] text-[#e5e1e4]'
                  : 'text-[#c0c7d5] hover:text-[#e5e1e4] hover:bg-[#353437]'
              }`}
            >
              <Icon className="mr-3 w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer Navigation */}
      <div className="mt-auto space-y-1 pt-4 border-t border-[#1F1F23]">
        {footerNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center px-3 py-2 rounded-lg font-medium text-sm transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'bg-[#3f495d] text-[#e5e1e4]'
                  : 'text-[#c0c7d5] hover:text-[#e5e1e4] hover:bg-[#353437]'
              }`}
            >
              <Icon className="mr-3 w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
