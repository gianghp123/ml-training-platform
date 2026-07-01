'use client';

import { useState } from 'react';
import { 
  Cpu, 
  Bell, 
  Save, 
  CheckCircle
} from 'lucide-react';
import PageHeader from '../shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function SettingsScreen() {
  const [gpuType, setGpuType] = useState('nvidia_a100');
  const [maxWorkers, setMaxWorkers] = useState('8');
  const [memoryCap, setMemoryCap] = useState('32');
  const [enableTelemetry, setEnableTelemetry] = useState(true);
  const [enableSlack, setEnableSlack] = useState(false);
  const [enableAutoSave, setEnableAutoSave] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header Component */}
      <PageHeader 
        title="System Configuration" 
        description="Configure global cluster settings, compute quotas, and notification tunnels." 
      />

      {/* Grid: 2 columns split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Resource allocations */}
        <Card className="bg-[#131315] border border-[#1F1F23] rounded-xl p-6 space-y-6 shadow-none">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-[#1F1F23]">
            <Cpu className="w-5 h-5 text-[#7A5AF8]" />
            <h3 className="text-sm font-bold text-[#e5e1e4]">Cluster Compute Quotas</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                Default GPU Class
              </label>
              <Select value={gpuType} onValueChange={setGpuType}>
                <SelectTrigger className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] h-9 focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="GPU Class" />
                </SelectTrigger>
                <SelectContent className="bg-[#131315] border border-[#1F1F23] text-xs text-[#e5e1e4]">
                  <SelectItem value="nvidia_a100">NVIDIA Tensor A100 GPU (80GB VRAM)</SelectItem>
                  <SelectItem value="nvidia_t4">NVIDIA Tesla T4 GPU (16GB VRAM)</SelectItem>
                  <SelectItem value="tpu_v4">Google Cloud TPU v4 (Supercomputer class)</SelectItem>
                  <SelectItem value="cpu_only">CPU Only node allocation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                  Max Parallel Workers
                </label>
                <Input
                  type="number"
                  value={maxWorkers}
                  onChange={(e) => setMaxWorkers(e.target.value)}
                  className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                  Node Memory Cap (GB)
                </label>
                <Input
                  type="number"
                  value={memoryCap}
                  onChange={(e) => setMemoryCap(e.target.value)}
                  className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Right Column: Alerts & Telemetry */}
        <Card className="bg-[#131315] border border-[#1F1F23] rounded-xl p-6 space-y-6 shadow-none">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-[#1F1F23]">
            <Bell className="w-5 h-5 text-[#FDB022]" />
            <h3 className="text-sm font-bold text-[#e5e1e4]">Notifications & Diagnostics</h3>
          </div>

          <div className="space-y-4">
            {/* Auto save toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-xs font-semibold text-[#e5e1e4] block">Auto-save Draft DAG changes</span>
                <span className="text-[10px] text-[#c0c7d5] mt-0.5">Saves node graph configuration automatically to cache.</span>
              </div>
              <Switch checked={enableAutoSave} onCheckedChange={setEnableAutoSave} />
            </div>

            {/* Slack integration toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-xs font-semibold text-[#e5e1e4] block">Slack Webhook alerts</span>
                <span className="text-[10px] text-[#c0c7d5] mt-0.5">Sends automated payload alerts to active Slack channels on execution errors.</span>
              </div>
              <Switch checked={enableSlack} onCheckedChange={setEnableSlack} />
            </div>

            {/* Diagnostic reporting */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-xs font-semibold text-[#e5e1e4] block">Diagnostic Telemetry level</span>
                <span className="text-[10px] text-[#c0c7d5] mt-0.5">Broadcast anonymized metrics to master registry clusters.</span>
              </div>
              <Switch checked={enableTelemetry} onCheckedChange={setEnableTelemetry} />
            </div>
          </div>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-4 pt-4 border-t border-[#1F1F23]/60">
        {saved && (
          <span className="text-[#32D583] text-xs font-semibold flex items-center space-x-1">
            <CheckCircle className="w-4 h-4" />
            <span>Settings updated successfully</span>
          </span>
        )}
        
        <Button
          onClick={handleSave}
          className="bg-[#3192fc] hover:bg-[#3192fc]/90 hover:brightness-110 text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center space-x-2 shadow-lg transition-all cursor-pointer h-10"
        >
          <Save className="w-4 h-4" />
          <span>Save Quota Configurations</span>
        </Button>
      </div>
    </div>
  );
}
