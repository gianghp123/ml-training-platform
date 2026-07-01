'use client';

import { useState } from 'react';
import { useOrchestrator } from '@/context/orchestrator-context';
import { Dataset } from '../../types';
import { 
  Database, 
  Layers, 
  Trash2, 
  Plus, 
  X, 
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import PageHeader from '../shared/PageHeader';
import StatusBadge from '../shared/StatusBadge';
import EmptyState from '../shared/EmptyState';

export default function DatasetsScreen() {
  const { datasets, addDataset, deleteDataset } = useOrchestrator();

  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(
    datasets.length > 0 ? datasets[0].id : null
  );

  const [showAddDatasetModal, setShowAddDatasetModal] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetSize, setNewDatasetSize] = useState('');
  const [newDatasetRows, setNewDatasetRows] = useState('');
  const [newDatasetFormat, setNewDatasetFormat] = useState<'csv' | 'parquet' | 'json'>('parquet');

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  // Mock schema lists based on dataset names
  const getSchemaDetails = (name: string) => {
    const isChurn = name.toLowerCase().includes('churn');
    if (isChurn) {
      return [
        { name: 'customer_id', type: 'VARCHAR(32)', nullable: 'NO', mean: 'N/A', missing: '0.0%' },
        { name: 'tenure_months', type: 'INTEGER', nullable: 'NO', mean: '24.50', missing: '0.0%' },
        { name: 'monthly_charges', type: 'DOUBLE', nullable: 'NO', mean: '64.80', missing: '0.0%' },
        { name: 'has_internet_service', type: 'BOOLEAN', nullable: 'NO', mean: '0.82', missing: '0.0%' },
        { name: 'contract_type', type: 'VARCHAR(16)', nullable: 'NO', mean: 'N/A', missing: '0.0%' },
        { name: 'churned', type: 'INTEGER', nullable: 'NO', mean: '0.26', missing: '0.0%' }
      ];
    } else {
      return [
        { name: 'id', type: 'INTEGER', nullable: 'NO', mean: 'N/A', missing: '0.0%' },
        { name: 'feature_vector_v1', type: 'DOUBLE[]', nullable: 'YES', mean: '0.00', missing: '3.4%' },
        { name: 'weight_class', type: 'VARCHAR(12)', nullable: 'YES', mean: 'N/A', missing: '0.0%' },
        { name: 'label', type: 'INTEGER', nullable: 'NO', mean: '1.45', missing: '0.0%' }
      ];
    }
  };

  const handleAddDataset = () => {
    if (!newDatasetName.trim()) return;

    const dataset: Dataset = {
      id: `dataset-${Date.now()}`,
      name: newDatasetName.replace(/\s+/g, '_'),
      size: newDatasetSize || '12.4 MB',
      format: newDatasetFormat,
      rows: newDatasetRows || '100,000 rows',
      status: 'ready',
      updatedTime: 'Registered just now'
    };

    addDataset(dataset);
    setSelectedDatasetId(dataset.id);
    
    // Reset Form
    setNewDatasetName('');
    setNewDatasetSize('');
    setNewDatasetRows('');
    setShowAddDatasetModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header Component */}
      <PageHeader 
        title="Dataset Catalog" 
        description="Register, configure, and inspect data assets for training workflows."
        action={{
          label: "Register Dataset",
          onClick: () => setShowAddDatasetModal(true),
          icon: Plus
        }}
      />

      {/* Grid: 2 columns for Lists + Visual Schema Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Datasets List (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#141416]/40 border border-[#1F1F23] rounded-xl overflow-hidden">
            {datasets.length > 0 ? (
              <table className="w-full text-left text-xs text-[#e5e1e4]">
                <thead className="bg-[#131315] border-b border-[#1F1F23] text-[10px] font-mono text-[#c0c7d5]/60 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Size</th>
                    <th className="p-4">Format</th>
                    <th className="p-4">Rows</th>
                    <th className="p-4">Sync Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F23]/50">
                  {datasets.map((dataset) => {
                    const isSelected = selectedDatasetId === dataset.id;
                    return (
                      <tr
                        key={dataset.id}
                        onClick={() => setSelectedDatasetId(dataset.id)}
                        className={`hover:bg-[#353437]/20 cursor-pointer transition-all ${
                          isSelected ? 'bg-[#3f495d]/20 border-l-2 border-[#3192fc]' : ''
                        }`}
                      >
                        <td className="p-4 font-semibold flex items-center space-x-2">
                          <FileSpreadsheet className="w-4 h-4 text-[#a6c8ff]" />
                          <span>{dataset.name}</span>
                        </td>
                        <td className="p-4 font-mono text-[#c0c7d5]">{dataset.size}</td>
                        <td className="p-4">
                          <span className="font-mono text-[10px] bg-[#353437] text-[#c0c7d5] px-2 py-0.5 rounded">
                            {dataset.format.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[#c0c7d5]/80">{dataset.rows}</td>
                        <td className="p-4">
                          <StatusBadge status={dataset.status} />
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDataset(dataset.id);
                              if (selectedDatasetId === dataset.id) setSelectedDatasetId(null);
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
                message="No datasets registered in catalog matching filters."
                icon={Database}
              />
            )}
          </div>
        </div>

        {/* Schema Column (Right Column) */}
        <div className="bg-[#131315] border border-[#1F1F23] rounded-xl overflow-hidden flex flex-col h-full justify-between">
          {selectedDataset ? (
            <div>
              <div className="p-4 border-b border-[#1F1F23] flex justify-between items-center bg-[#141416]">
                <div>
                  <h3 className="text-sm font-bold text-[#e5e1e4] truncate">{selectedDataset.name}</h3>
                  <p className="text-[10px] font-mono text-[#c0c7d5] opacity-70">
                    Schema Columns & Sample Stats
                  </p>
                </div>
                <Database className="w-5 h-5 text-[#3192fc]/80" />
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs bg-[#09090b] border border-[#1f1f23] p-3 rounded-lg">
                  <div>
                    <span className="text-[#c0c7d5]/60 block text-[10px] uppercase font-mono">Row Cardinality</span>
                    <span className="font-bold font-mono text-[#e5e1e4]">{selectedDataset.rows}</span>
                  </div>
                  <div>
                    <span className="text-[#c0c7d5]/60 block text-[10px] uppercase font-mono">Disk Storage</span>
                    <span className="font-bold font-mono text-[#e5e1e4]">{selectedDataset.size}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-mono text-[#c0c7d5]/50 uppercase tracking-wider mb-2">
                    Attributes List
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {getSchemaDetails(selectedDataset.name).map((col, index) => (
                      <div
                        key={index}
                        className="bg-[#141416] border border-[#1F1F23]/60 rounded-lg p-2.5 text-xs flex justify-between items-center hover:border-[#3192fc]/40 transition-colors"
                      >
                        <div>
                          <span className="font-semibold block text-[#e5e1e4]">{col.name}</span>
                          <span className="font-mono text-[9px] text-[#3192fc]">{col.type}</span>
                        </div>
                        <div className="text-right text-[10px] font-mono text-[#c0c7d5]/70">
                          <div>Nulls: {col.missing}</div>
                          {col.mean !== 'N/A' && <div>Mean: {col.mean}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60 min-h-[350px]">
              <Layers className="w-8 h-8 text-[#c0c7d5] mb-2" />
              <p className="text-xs text-[#c0c7d5]">Select a data catalog row on the left to inspect detailed column profiles.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Dataset Modal Overlay */}
      {showAddDatasetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131315] border border-[#1F1F23] rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#1F1F23] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#e5e1e4] flex items-center">
                <Sparkles className="w-4 h-4 text-[#3192fc] mr-1.5" />
                Register Dataset Asset
              </h3>
              <button
                onClick={() => setShowAddDatasetModal(false)}
                className="text-[#c0c7d5] hover:text-[#e5e1e4] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                  Dataset Name
                </label>
                <input
                  type="text"
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                  placeholder="e.g. users_activity_log"
                  className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] focus:ring-2 focus:ring-[#3192fc]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                    Disk Size
                  </label>
                  <input
                    type="text"
                    value={newDatasetSize}
                    onChange={(e) => setNewDatasetSize(e.target.value)}
                    placeholder="e.g. 42.5 MB, 1.2 GB"
                    className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] focus:ring-2 focus:ring-[#3192fc]/20"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                    Row Cardinality
                  </label>
                  <input
                    type="text"
                    value={newDatasetRows}
                    onChange={(e) => setNewDatasetRows(e.target.value)}
                    placeholder="e.g. 150,000 rows"
                    className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] focus:ring-2 focus:ring-[#3192fc]/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                  File Format
                </label>
                <select
                  value={newDatasetFormat}
                  onChange={(e) => setNewDatasetFormat(e.target.value as 'csv' | 'parquet' | 'json')}
                  className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc]"
                >
                  <option value="parquet">Apache Parquet (Columnar - Recommended)</option>
                  <option value="csv">Comma-Separated Values (CSV)</option>
                  <option value="json">Structured JSON Records</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-[#141416] border-t border-[#1F1F23] flex justify-end space-x-2">
              <button
                onClick={() => setShowAddDatasetModal(false)}
                className="bg-transparent hover:bg-[#353437] text-[#c0c7d5] px-3 py-1.5 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDataset}
                disabled={!newDatasetName.trim()}
                className="bg-[#3192fc] hover:brightness-110 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Register Data Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
