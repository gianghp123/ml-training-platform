'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrchestrator } from '@/context/orchestrator-context';
import { Search, Bell, HelpCircle } from 'lucide-react';

export default function TopAppBar() {
  const router = useRouter();
  const { searchQuery, setSearchQuery } = useOrchestrator();
  const [showNotifications, setShowNotifications] = useState(false);

  // Mock notifications
  const notifications = [
    { id: 1, text: 'Pipeline Fraud_Detection_V2 finished successfully', time: '2h ago', unread: true },
    { id: 2, text: 'NLP_Transformer_Train failed on evaluation step', time: '5m ago', unread: true },
    { id: 3, text: 'Dataset customer_churn.csv processed successfully', time: '1d ago', unread: false },
  ];

  return (
    <header className="bg-[#131315] h-[48px] w-full sticky top-0 z-50 border-b border-[#1F1F23] flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center space-x-6">
        <div className="text-sm font-bold text-[#3192fc] tracking-tight uppercase">
          Pipeline Studio
        </div>
        
        {/* Search Bar */}
        <div className="relative hidden lg:flex items-center">
          <Search className="absolute left-3 text-[#c0c7d5] w-[14px] h-[14px] opacity-70" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#050505] border border-[#1F1F23] rounded-lg pl-9 pr-3 py-1 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] focus:ring-2 focus:ring-[#3192fc]/20 w-64 transition-all placeholder:text-[#c0c7d5]/50"
            placeholder="Search resources..."
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-[#c0c7d5] hover:text-[#e5e1e4] text-[10px] font-mono px-1 rounded hover:bg-[#353437]"
            >
              clear
            </button>
          )}
        </div>
      </div>

      {/* Trailing Actions */}
      <div className="flex items-center space-x-2 relative">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-[#c0c7d5] hover:text-[#e5e1e4] hover:bg-[#2a2a2c] p-1.5 rounded-lg transition-all relative"
          >
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#F04438]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#131315] border border-[#1F1F23] rounded-xl shadow-2xl p-4 z-50 text-xs">
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#1F1F23]">
                <span className="font-bold text-[#e5e1e4]">Notifications</span>
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="text-[10px] text-[#c0c7d5] hover:text-[#e5e1e4]"
                >
                  Dismiss
                </button>
              </div>
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif.id} className="flex flex-col space-y-1">
                    <div className="flex items-start justify-between">
                      <p className={`text-[#e5e1e4] ${notif.unread ? 'font-medium' : 'opacity-75'}`}>
                        {notif.text}
                      </p>
                      {notif.unread && <span className="w-1.5 h-1.5 rounded-full bg-[#3192fc] mt-1 shrink-0 ml-2" />}
                    </div>
                    <span className="text-[10px] text-[#c0c7d5]/50">{notif.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Help */}
        <button 
          onClick={() => router.push('/documentation')}
          className="text-[#c0c7d5] hover:text-[#e5e1e4] hover:bg-[#2a2a2c] p-1.5 rounded-lg transition-all"
        >
          <HelpCircle className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  );
}
