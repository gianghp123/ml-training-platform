'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Pipeline } from '../../types';
import { 
  ArrowLeft, 
  Eye, 
  Download, 
  MoreVertical,
  SlidersHorizontal
} from 'lucide-react';
import StatCard from '../shared/StatCard';
import StatusBadge from '../shared/StatusBadge';

interface PipelineResultsScreenProps {
  pipeline: Pipeline;
}

export default function PipelineResultsScreen({ pipeline }: PipelineResultsScreenProps) {
  const router = useRouter();

  // Export mock report helper
  const handleExportReport = () => {
    alert(`Exporting training report for pipeline: ${pipeline.name} as PDF...`);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/pipelines')}
            className="p-1.5 rounded-lg border border-[#1F1F23] bg-[#131315] hover:bg-[#353437] text-[#c0c7d5] hover:text-[#e5e1e4] transition-all cursor-pointer"
            title="Back to Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-[#e5e1e4] tracking-tight">Run Results: {pipeline.name}</h2>
              <StatusBadge status="completed" />
            </div>
            <p className="text-xs text-[#c0c7d5] mt-1">Evaluation and neural metrics audit generated from the latest execution run.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.push(`/pipelines/${pipeline.id}`)}
            className="bg-[#131315] border border-[#1F1F23] hover:bg-[#353437] text-[#e5e1e4] text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Pipeline</span>
          </button>

          <button
            onClick={handleExportReport}
            className="bg-[#3192fc] hover:brightness-110 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Metrics Row using StatCard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Accuracy" 
          value="94.2 %" 
          accentColor="green"
          indicator={{
            type: 'success',
            text: '+1.4% vs baseline',
            icon: 'up'
          }}
        />

        <StatCard 
          label="F1 Score" 
          value="0.91" 
          accentColor="orange"
          indicator={{
            type: 'default',
            text: 'Target > 0.90 achieved'
          }}
        />

        <StatCard 
          label="Training Time" 
          value="12m 45s" 
          accentColor="purple"
          indicator={{
            type: 'success',
            text: '-2m 10s faster',
            icon: 'down'
          }}
        />

        <StatCard 
          label="Dataset Size" 
          value="1.2M rows" 
          accentColor="blue"
          indicator={{
            type: 'default',
            text: '14 features, 2 classes'
          }}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Confusion Matrix Panel */}
        <div className="bg-[#131315] border border-[#1F1F23] rounded-xl p-5 flex flex-col justify-between min-h-[360px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-[#e5e1e4] tracking-wide">Confusion Matrix</h3>
            <button className="text-[#c0c7d5]/50 hover:text-white transition-colors cursor-pointer">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Matrix Visualization */}
          <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
            <div className="text-[9px] font-mono text-[#c0c7d5]/40 absolute top-0 text-center uppercase tracking-widest w-full">
              Predicted Class
            </div>

            {/* Matrix Core */}
            <div className="flex items-center space-x-4 mt-6">
              {/* Row Label (Actual Class) */}
              <div className="text-[9px] font-mono text-[#c0c7d5]/40 uppercase tracking-widest -rotate-90 select-none w-4">
                Actual Class
              </div>

              {/* Grid 2x2 Container */}
              <div className="grid grid-cols-2 gap-2 w-64 h-64 text-center font-mono">
                {/* Labels Header */}
                <div className="text-[10px] text-[#c0c7d5]/60 font-semibold py-1">Negative</div>
                <div className="text-[10px] text-[#c0c7d5]/60 font-semibold py-1">Positive</div>

                {/* Neg - Neg (True Negative) */}
                <div className="bg-[#a6c8ff]/20 border border-[#a6c8ff]/30 rounded-lg flex flex-col justify-center items-center p-4 relative group">
                  <span className="absolute top-1 left-2 text-[8px] text-[#c0c7d5]/40 uppercase">Neg</span>
                  <span className="text-base font-bold text-[#a6c8ff]">45,210</span>
                  <span className="text-[8px] text-[#c0c7d5]/40 mt-1">TN</span>
                </div>

                {/* Neg - Pos (False Positive) */}
                <div className="bg-[#F04438]/10 border border-[#F04438]/20 rounded-lg flex flex-col justify-center items-center p-4 relative group">
                  <span className="absolute top-1 left-2 text-[8px] text-[#c0c7d5]/40 uppercase">Neg</span>
                  <span className="text-base font-bold text-[#F04438]">1,204</span>
                  <span className="text-[8px] text-[#c0c7d5]/40 mt-1">FP</span>
                </div>

                {/* Pos - Neg (False Negative) */}
                <div className="bg-[#F04438]/10 border border-[#F04438]/20 rounded-lg flex flex-col justify-center items-center p-4 relative group">
                  <span className="absolute top-1 left-2 text-[8px] text-[#c0c7d5]/40 uppercase">Pos</span>
                  <span className="text-base font-bold text-[#F04438]">4,320</span>
                  <span className="text-[8px] text-[#c0c7d5]/40 mt-1">FN</span>
                </div>

                {/* Pos - Pos (True Positive) */}
                <div className="bg-[#a6c8ff]/25 border border-[#a6c8ff]/40 rounded-lg flex flex-col justify-center items-center p-4 relative group">
                  <span className="absolute top-1 left-2 text-[8px] text-[#c0c7d5]/40 uppercase">Pos</span>
                  <span className="text-base font-bold text-[#a6c8ff]">8,950</span>
                  <span className="text-[8px] text-[#c0c7d5]/40 mt-1">TP</span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center space-x-4 mt-6 text-[10px] text-[#c0c7d5]/60 font-semibold font-mono">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#a6c8ff]/50 border border-[#a6c8ff]/60 inline-block"></span>
                <span>High Match</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#F04438]/20 border border-[#F04438]/40 inline-block"></span>
                <span>Mismatch</span>
              </div>
            </div>
          </div>
        </div>

        {/* Training Loss Panel */}
        <div className="bg-[#131315] border border-[#1F1F23] rounded-xl p-5 flex flex-col justify-between min-h-[360px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-[#e5e1e4] tracking-wide">Training Loss</h3>
            
            {/* Chart Legend */}
            <div className="flex items-center space-x-3 text-[10px] font-mono text-[#c0c7d5]/60">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3192fc] inline-block"></span>
                <span>Train</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FDB022] inline-block"></span>
                <span>Val</span>
              </div>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="flex-1 flex flex-col items-center justify-center relative py-4">
            <svg viewBox="0 0 100 50" className="w-full h-56 overflow-visible">
              {/* Grid Lines */}
              <line x1="10" y1="5" x2="95" y2="5" stroke="#1F1F23" strokeWidth="0.5" />
              <line x1="10" y1="15" x2="95" y2="15" stroke="#1F1F23" strokeWidth="0.5" />
              <line x1="10" y1="25" x2="95" y2="25" stroke="#1F1F23" strokeWidth="0.5" />
              <line x1="10" y1="35" x2="95" y2="35" stroke="#1F1F23" strokeWidth="0.5" />
              <line x1="10" y1="45" x2="95" y2="45" stroke="#1F1F23" strokeWidth="1" />
              <line x1="10" y1="5" x2="10" y2="45" stroke="#1F1F23" strokeWidth="1" />

              {/* Y Axis text label */}
              <text x="5" y="25" fill="#c0c7d5" fontSize="2" fontFamily="monospace" textAnchor="middle" transform="rotate(-90 5 25)" opacity="0.4">
                Loss
              </text>

              {/* Train Curve (Blue) */}
              <path
                d="M 10 10 C 20 18, 30 25, 40 33 C 50 40, 70 43, 95 44"
                fill="none"
                stroke="#3192fc"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {/* Val Curve (Orange/Yellow dashed) */}
              <path
                d="M 10 15 C 20 22, 35 30, 45 36 C 55 40, 75 41, 95 41"
                fill="none"
                stroke="#FDB022"
                strokeWidth="1.2"
                strokeDasharray="2,2"
                strokeLinecap="round"
              />

              {/* Epoch labels */}
              <text x="10" y="49" fill="#c0c7d5" fontSize="2.2" fontFamily="monospace" opacity="0.5">
                Epoch 0
              </text>
              <text x="95" y="49" fill="#c0c7d5" fontSize="2.2" fontFamily="monospace" textAnchor="end" opacity="0.5">
                Epoch 50
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* Detailed Classification Report Table */}
      <div className="bg-[#131315] border border-[#1F1F23] rounded-xl overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[#1F1F23] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141416]">
          <h3 className="text-xs font-bold text-[#e5e1e4] tracking-wide flex items-center">
            <SlidersHorizontal className="w-4 h-4 text-[#a6c8ff] mr-2" />
            Detailed Evaluation Report
          </h3>

          <div className="relative">
            <input
              type="text"
              readOnly
              value=""
              placeholder="Filter metrics..."
              className="bg-[#050505] border border-[#1F1F23] rounded-lg pl-3 pr-3 py-1 text-xs text-[#e5e1e4] focus:outline-none w-48 placeholder:text-[#c0c7d5]/30 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Report Table */}
        <table className="w-full text-left text-xs text-[#e5e1e4] font-mono">
          <thead className="bg-[#0d0d10] border-b border-[#1F1F23] text-[10px] text-[#c0c7d5]/50 uppercase tracking-wider">
            <tr>
              <th className="p-4">Class / Metric</th>
              <th className="p-4">Precision</th>
              <th className="p-4">Recall</th>
              <th className="p-4">F1-Score</th>
              <th className="p-4 text-right">Support</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F23]/50">
            {/* Class 0 */}
            <tr className="hover:bg-[#353437]/10 transition-colors">
              <td className="p-4 font-semibold text-[#c0c7d5] flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c0c7d5]/60 mr-2"></span>
                0 (Negative)
              </td>
              <td className="p-4 text-[#3192fc]">0.96</td>
              <td className="p-4">0.97</td>
              <td className="p-4 font-bold">0.96</td>
              <td className="p-4 text-right text-[#c0c7d5]/60">46,414</td>
            </tr>

            {/* Class 1 */}
            <tr className="hover:bg-[#353437]/10 transition-colors">
              <td className="p-4 font-semibold text-[#c0c7d5] flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F04438] mr-2"></span>
                1 (Positive)
              </td>
              <td className="p-4">0.88</td>
              <td className="p-4">0.67</td>
              <td className="p-4 text-[#FDB022] font-bold">0.76</td>
              <td className="p-4 text-right text-[#c0c7d5]/60">13,270</td>
            </tr>

            {/* Accuracy Row */}
            <tr className="bg-[#050505]/40 font-bold border-t border-[#1F1F23]">
              <td className="p-4 text-[#e5e1e4] pl-7">Accuracy</td>
              <td className="p-4"></td>
              <td className="p-4"></td>
              <td className="p-4 text-[#32D583]">0.94</td>
              <td className="p-4 text-right text-[#c0c7d5]/80">59,684</td>
            </tr>

            {/* Macro Avg */}
            <tr className="text-[#c0c7d5]/80 hover:bg-[#353437]/10 transition-colors">
              <td className="p-4 pl-7">Macro Avg</td>
              <td className="p-4">0.92</td>
              <td className="p-4">0.82</td>
              <td className="p-4 font-bold">0.86</td>
              <td className="p-4 text-right text-[#c0c7d5]/40">59,684</td>
            </tr>

            {/* Weighted Avg */}
            <tr className="text-[#c0c7d5]/80 hover:bg-[#353437]/10 transition-colors">
              <td className="p-4 pl-7">Weighted Avg</td>
              <td className="p-4">0.94</td>
              <td className="p-4">0.94</td>
              <td className="p-4 font-bold">0.94</td>
              <td className="p-4 text-right text-[#c0c7d5]/40">59,684</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
