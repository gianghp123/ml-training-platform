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
          <div className="bg-[#141416]/40 border border-[#1F1F23] rounded-xl overflow-hidden">
            {models.length > 0 ? (
              <table className="w-full text-left text-xs text-[#e5e1e4]">
                <thead className="bg-[#131315] border-b border-[#1F1F23] text-[10px] font-mono text-[#c0c7d5]/60 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Model Name</th>
                    <th className="p-4">Framework</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Accuracy</th>
                    <th className="p-4">F1-Score</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F23]/50">
                  {models.map((model) => {
                    const isSelected = selectedModelId === model.id;
                    return (
                      <tr
                        key={model.id}
                        onClick={() => setSelectedModelId(model.id)}
                        className={`hover:bg-[#353437]/20 cursor-pointer transition-all ${
                          isSelected ? 'bg-[#3f495d]/20 border-l-2 border-[#3192fc]' : ''
                        }`}
                      >
                        <td className="p-4 font-semibold flex items-center space-x-2">
                          <Brain className="w-4 h-4 text-[#7A5AF8]" />
                          <div>
                            <span className="block">{model.name}</span>
                            <span className="text-[10px] font-mono text-[#c0c7d5]/50">{model.version}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[#c0c7d5]">{model.framework}</td>
                        <td className="p-4 text-[#c0c7d5]/80">{model.type}</td>
                        <td className="p-4 font-mono font-bold text-[#32D583]">{(model.accuracy * 100).toFixed(1)}%</td>
                        <td className="p-4 font-mono text-[#a6c8ff]">{(model.f1Score * 100).toFixed(1)}%</td>
                        <td className="p-4">
                          <StatusBadge status="active" />
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteModel(model.id);
                              if (selectedModelId === model.id) setSelectedModelId(null);
                            }}
                            className="text-[#c0c7d5] hover:text-[#F04438] p-1 rounded hover:bg-[#353437] transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyState 
                message="No registered models found matching search queries."
                icon={Brain}
              />
            )}
          </div>
        </div>

        {/* Selected Model Details & Visual ROC Curves (Right column) */}
        <div className="bg-[#131315] border border-[#1F1F23] rounded-xl overflow-hidden flex flex-col h-full justify-between">
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
        </div>
      </div>

      {/* Add Model Modal Overlay */}
      {showAddModelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131315] border border-[#1F1F23] rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#1F1F23] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#e5e1e4] flex items-center">
                <Sparkles className="w-4 h-4 text-[#7A5AF8] mr-1.5" />
                Register Production Model
              </h3>
              <button
                onClick={() => setShowAddModelModal(false)}
                className="text-[#c0c7d5] hover:text-[#e5e1e4] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                  Model Name
                </label>
                <input
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="e.g. ResNet_Classifier_V2"
                  className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] focus:ring-2 focus:ring-[#3192fc]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                    ML Framework
                  </label>
                  <select
                    value={newModelFramework}
                    onChange={(e) => setNewModelFramework(e.target.value)}
                    className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc]"
                  >
                    <option value="PyTorch">PyTorch</option>
                    <option value="TensorFlow">TensorFlow</option>
                    <option value="XGBoost">XGBoost</option>
                    <option value="Scikit-Learn">Scikit-Learn</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                    Model Task
                  </label>
                  <select
                    value={newModelType}
                    onChange={(e) => setNewModelType(e.target.value)}
                    className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc]"
                  >
                    <option value="Binary Classifier">Binary Classifier</option>
                    <option value="NLP Transformer">NLP Transformer</option>
                    <option value="Regression Engine">Regression Engine</option>
                    <option value="Computer Vision">Computer Vision</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                  Expected Accuracy (%)
                </label>
                <input
                  type="number"
                  value={newModelAccuracy}
                  onChange={(e) => setNewModelAccuracy(e.target.value)}
                  placeholder="e.g. 94.2"
                  min="50"
                  max="100"
                  step="0.1"
                  className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] focus:ring-2 focus:ring-[#3192fc]/20"
                />
              </div>
            </div>

            <div className="p-4 bg-[#141416] border-t border-[#1F1F23] flex justify-end space-x-2">
              <button
                onClick={() => setShowAddModelModal(false)}
                className="bg-transparent hover:bg-[#353437] text-[#c0c7d5] px-3 py-1.5 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddModel}
                disabled={!newModelName.trim()}
                className="bg-[#3192fc] hover:brightness-110 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Register Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
