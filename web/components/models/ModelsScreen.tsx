'use client';

import { useState } from 'react';
import { useOrchestrator } from '@/context/orchestrator-context';
import { MLModel } from '../../types';
import { 
  Brain, 
  Trash2, 
  Plus, 
  TrendingUp, 
  Layers, 
  X, 
  Sparkles
} from 'lucide-react';
import PageHeader from '../shared/PageHeader';
import StatusBadge from '../shared/StatusBadge';
import EmptyState from '../shared/EmptyState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ModelsScreen() {
  const { models, addModel, deleteModel } = useOrchestrator();

  const [selectedModelId, setSelectedModelId] = useState<string | null>(
    models.length > 0 ? models[0].id : null
  );

  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelFramework, setNewModelFramework] = useState('PyTorch');
  const [newModelType, setNewModelType] = useState('Binary Classifier');
  const [newModelAccuracy, setNewModelAccuracy] = useState('94.2');

  const selectedModel = models.find((m) => m.id === selectedModelId);

  const handleAddModel = () => {
    if (!newModelName.trim()) return;

    const acc = parseFloat(newModelAccuracy) / 100 || 0.942;
    const model: MLModel = {
      id: `model-${Date.now()}`,
      name: newModelName.replace(/\s+/g, '_'),
      version: `v1.0.${Math.floor(Math.random() * 10)}`,
      framework: newModelFramework,
      accuracy: acc,
      f1Score: acc - 0.03,
      type: newModelType,
      status: 'active',
      updatedTime: 'Registered just now'
    };

    addModel(model);
    setSelectedModelId(model.id);
    
    // Reset Form
    setNewModelName('');
    setNewModelAccuracy('94.2');
    setShowAddModelModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header Component */}
      <PageHeader 
        title="Model Registry" 
        description="Audit, register, and query production-grade ML models and neural structures."
        action={{
          label: "Register Model",
          onClick: () => setShowAddModelModal(true),
          icon: Plus
        }}
      />

      {/* Grid: 2 columns list + Interactive metrics detail (ROC curves!) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Models List (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-[#141416]/40 border border-[#1F1F23] rounded-xl overflow-hidden shadow-none">
            {models.length > 0 ? (
              <Table className="w-full text-left text-xs text-[#e5e1e4]">
                <TableHeader className="bg-[#131315] border-b border-[#1F1F23] text-[10px] font-mono text-[#c0c7d5]/60 uppercase tracking-wider hover:bg-transparent">
                  <TableRow className="border-b border-[#1F1F23]/60 hover:bg-transparent">
                    <TableHead className="p-4 text-[#c0c7d5]/60 font-mono">Model Name</TableHead>
                    <TableHead className="p-4 text-[#c0c7d5]/60 font-mono">Framework</TableHead>
                    <TableHead className="p-4 text-[#c0c7d5]/60 font-mono">Type</TableHead>
                    <TableHead className="p-4 text-[#c0c7d5]/60 font-mono">Accuracy</TableHead>
                    <TableHead className="p-4 text-[#c0c7d5]/60 font-mono">F1-Score</TableHead>
                    <TableHead className="p-4 text-[#c0c7d5]/60 font-mono">Status</TableHead>
                    <TableHead className="p-4 text-right text-[#c0c7d5]/60 font-mono">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#1F1F23]/50">
                  {models.map((model) => {
                    const isSelected = selectedModelId === model.id;
                    return (
                      <TableRow
                        key={model.id}
                        onClick={() => setSelectedModelId(model.id)}
                        className={`hover:bg-[#353437]/20 cursor-pointer transition-all border-b border-[#1F1F23]/50 ${
                          isSelected ? 'bg-[#3f495d]/20 border-l-2 border-l-[#3192fc]' : ''
                        }`}
                      >
                        <TableCell className="p-4 font-semibold flex items-center space-x-2">
                          <Brain className="w-4 h-4 text-[#7A5AF8]" />
                          <div>
                            <span className="block">{model.name}</span>
                            <span className="text-[10px] font-mono text-[#c0c7d5]/50">{model.version}</span>
                          </div>
                        </TableCell>
                        <TableCell className="p-4 font-mono text-[#c0c7d5]">{model.framework}</TableCell>
                        <TableCell className="p-4 text-[#c0c7d5]/80">{model.type}</TableCell>
                        <TableCell className="p-4 font-mono font-bold text-[#32D583]">{(model.accuracy * 100).toFixed(1)}%</TableCell>
                        <TableCell className="p-4 font-mono text-[#a6c8ff]">{(model.f1Score * 100).toFixed(1)}%</TableCell>
                        <TableCell className="p-4">
                          <StatusBadge status="active" />
                        </TableCell>
                        <TableCell className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteModel(model.id);
                              if (selectedModelId === model.id) setSelectedModelId(null);
                            }}
                            className="text-[#c0c7d5] hover:text-[#F04438] p-1 rounded hover:bg-[#353437] hover:text-[#F04438] transition-all cursor-pointer w-7 h-7"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState 
                message="No registered models found matching search queries."
                icon={Brain}
              />
            )}
          </Card>
        </div>

        {/* Selected Model Details & Visual ROC Curves (Right column) */}
        <Card className="bg-[#131315] border border-[#1F1F23] rounded-xl overflow-hidden flex flex-col h-full justify-between shadow-none">
          {selectedModel ? (
            <div>
              <div className="p-4 border-b border-[#1F1F23] flex justify-between items-center bg-[#141416]">
                <div>
                  <h3 className="text-sm font-bold text-[#e5e1e4] truncate">{selectedModel.name}</h3>
                  <p className="text-[10px] font-mono text-[#c0c7d5] opacity-70">
                    Neural performance reports
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-[#32D583]/80" />
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs bg-[#09090b] border border-[#1f1f23] p-3 rounded-lg">
                  <div>
                    <span className="text-[#c0c7d5]/60 block text-[10px] uppercase font-mono">ROC Accuracy</span>
                    <span className="font-bold font-mono text-[#32D583]">{(selectedModel.accuracy * 100).toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-[#c0c7d5]/60 block text-[10px] uppercase font-mono">F1-Score</span>
                    <span className="font-bold font-mono text-[#a6c8ff]">{(selectedModel.f1Score * 100).toFixed(2)}%</span>
                  </div>
                </div>

                {/* SVG Visual ROC Chart representation */}
                <div>
                  <h4 className="text-[10px] font-mono text-[#c0c7d5]/50 uppercase tracking-wider mb-2 flex justify-between">
                    <span>ROC Curve Plot</span>
                    <span>AUC = {(selectedModel.accuracy + 0.02).toFixed(3)}</span>
                  </h4>
                  
                  <div className="bg-[#050505] border border-[#1F1F23] rounded-lg p-3 flex flex-col items-center justify-center relative">
                    <svg viewBox="0 0 100 100" className="w-full h-36 overflow-visible">
                      {/* Grid lines */}
                      <line x1="0" y1="100" x2="100" y2="100" stroke="#1F1F23" strokeWidth="1" />
                      <line x1="0" y1="0" x2="0" y2="100" stroke="#1F1F23" strokeWidth="1" />
                      
                      {/* Threshold random chance diagonal */}
                      <line x1="0" y1="100" x2="100" y2="0" stroke="#1F1F23" strokeWidth="0.5" strokeDasharray="2,2" />
                      
                      {/* Dynamic ROC Curve path based on selectedModel.accuracy */}
                      <path
                        d={`M 0 100 Q 5 ${100 - (selectedModel.accuracy * 90)} 100 0`}
                        fill="none"
                        stroke="#32D583"
                        strokeWidth="2"
                        className="animate-pulse"
                      />
                      
                      {/* Highlight Dot on ROC threshold */}
                      <circle cx="20" cy={100 - (selectedModel.accuracy * 75)} r="3" fill="#3192fc" />
                    </svg>
                    
                    <div className="flex justify-between w-full text-[8px] font-mono text-[#c0c7d5]/60 mt-1">
                      <span>False Positive Rate (FPR)</span>
                      <span>True Positive (TPR)</span>
                    </div>
                  </div>
                </div>

                {/* Hyper-parameters Schema details */}
                <div>
                  <h4 className="text-[10px] font-mono text-[#c0c7d5]/50 uppercase tracking-wider mb-2">
                    Hyperparameters
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between p-2 bg-[#141416] border border-[#1F1F23]/60 rounded-lg">
                      <span className="text-[#c0c7d5]/70">Activation Function</span>
                      <span className="font-mono font-medium text-[#e5e1e4]">GeLU / LeakyReLU</span>
                    </div>
                    <div className="flex justify-between p-2 bg-[#141416] border border-[#1F1F23]/60 rounded-lg">
                      <span className="text-[#c0c7d5]/70">Optimization Method</span>
                      <span className="font-mono font-medium text-[#e5e1e4]">AdamW (lr=3e-4)</span>
                    </div>
                    <div className="flex justify-between p-2 bg-[#141416] border border-[#1F1F23]/60 rounded-lg">
                      <span className="text-[#c0c7d5]/70">L2 regularization</span>
                      <span className="font-mono font-medium text-[#e5e1e4]">1e-5 lambda</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60 min-h-[350px]">
              <Layers className="w-8 h-8 text-[#c0c7d5] mb-2" />
              <p className="text-xs text-[#c0c7d5]">Select an ML model from the left column registry to audit mathematical profiles.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Add Model Modal Overlay */}
      <Dialog open={showAddModelModal} onOpenChange={setShowAddModelModal}>
        <DialogContent className="bg-[#131315] border border-[#1F1F23] rounded-xl w-full max-w-md overflow-hidden shadow-2xl p-0 text-[#e5e1e4]">
          <DialogHeader className="p-4 border-b border-[#1F1F23] flex justify-between items-center bg-[#141416] flex-row space-y-0">
            <DialogTitle className="text-sm font-bold text-[#e5e1e4] flex items-center">
              <Sparkles className="w-4 h-4 text-[#7A5AF8] mr-1.5" />
              Register Production Model
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                Model Name
              </label>
              <Input
                type="text"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="e.g. ResNet_Classifier_V2"
                className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                  ML Framework
                </label>
                <Select
                  value={newModelFramework}
                  onValueChange={setNewModelFramework}
                >
                  <SelectTrigger className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] h-9 focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Framework" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131315] border border-[#1F1F23] text-xs text-[#e5e1e4]">
                    <SelectItem value="PyTorch">PyTorch</SelectItem>
                    <SelectItem value="TensorFlow">TensorFlow</SelectItem>
                    <SelectItem value="XGBoost">XGBoost</SelectItem>
                    <SelectItem value="Scikit-Learn">Scikit-Learn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                  Model Task
                </label>
                <Select
                  value={newModelType}
                  onValueChange={setNewModelType}
                >
                  <SelectTrigger className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] h-9 focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Task" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131315] border border-[#1F1F23] text-xs text-[#e5e1e4]">
                    <SelectItem value="Binary Classifier">Binary Classifier</SelectItem>
                    <SelectItem value="NLP Transformer">NLP Transformer</SelectItem>
                    <SelectItem value="Regression Engine">Regression Engine</SelectItem>
                    <SelectItem value="Computer Vision">Computer Vision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                Expected Accuracy (%)
              </label>
              <Input
                type="number"
                value={newModelAccuracy}
                onChange={(e) => setNewModelAccuracy(e.target.value)}
                placeholder="e.g. 94.2"
                min="50"
                max="100"
                step="0.1"
                className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-[#141416] border-t border-[#1F1F23] flex justify-end space-x-2 sm:space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowAddModelModal(false)}
              className="bg-transparent hover:bg-[#353437] text-[#c0c7d5] hover:text-[#c0c7d5] hover:bg-[#353437] px-3 py-1.5 rounded-lg text-xs cursor-pointer border border-[#1f1f23] h-8"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddModel}
              disabled={!newModelName.trim()}
              className="bg-[#3192fc] hover:bg-[#3192fc]/90 hover:brightness-110 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer h-8"
            >
              Register Model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
