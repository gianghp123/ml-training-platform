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
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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
          <Card className="bg-[#141416]/40 border border-[#1F1F23] rounded-xl overflow-hidden shadow-none">
            {datasets.length > 0 ? (
              <Table className="w-full text-left text-xs text-[#e5e1e4]">
                <TableHeader className="bg-[#131315] border-b border-[#1F1F23] text-[10px] font-mono text-[#c0c7d5]/60 uppercase tracking-wider hover:bg-transparent">
                  <TableRow className="border-b border-[#1F1F23]/60 hover:bg-transparent">
                    <TableHead className="p-4 text-[#c0c7d5]/60 font-mono">Name</TableHead>
                    <TableHead className="p-4 text-[#c0c7d5]/60 font-mono">Size</TableHead>
                    <TableHead className="p-4 text-[#c0c7d5]/60 font-mono">Format</TableHead>
                    <TableHead className="p-4 text-[#c0c7d5]/60 font-mono">Rows</TableHead>
                    <TableHead className="p-4 text-[#c0c7d5]/60 font-mono">Sync Status</TableHead>
                    <TableHead className="p-4 text-right text-[#c0c7d5]/60 font-mono">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#1F1F23]/50">
                  {datasets.map((dataset) => {
                    const isSelected = selectedDatasetId === dataset.id;
                    return (
                      <TableRow
                        key={dataset.id}
                        onClick={() => setSelectedDatasetId(dataset.id)}
                        className={`hover:bg-[#353437]/20 cursor-pointer transition-all border-b border-[#1F1F23]/50 ${
                          isSelected ? 'bg-[#3f495d]/20 border-l-2 border-l-[#3192fc]' : ''
                        }`}
                      >
                        <TableCell className="p-4 font-semibold flex items-center space-x-2">
                          <FileSpreadsheet className="w-4 h-4 text-[#a6c8ff]" />
                          <span>{dataset.name}</span>
                        </TableCell>
                        <TableCell className="p-4 font-mono text-[#c0c7d5]">{dataset.size}</TableCell>
                        <TableCell className="p-4">
                          <Badge variant="secondary" className="font-mono text-[10px] bg-[#353437] text-[#c0c7d5] px-2 py-0.5 rounded border border-none">
                            {dataset.format.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-4 font-mono text-[#c0c7d5]/80">{dataset.rows}</TableCell>
                        <TableCell className="p-4">
                          <StatusBadge status={dataset.status} />
                        </TableCell>
                        <TableCell className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDataset(dataset.id);
                              if (selectedDatasetId === dataset.id) setSelectedDatasetId(null);
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
                message="No datasets registered in catalog matching filters."
                icon={Database}
              />
            )}
          </Card>
        </div>

        {/* Schema Column (Right Column) */}
        <Card className="bg-[#131315] border border-[#1F1F23] rounded-xl overflow-hidden flex flex-col h-full justify-between shadow-none">
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
        </Card>
      </div>

      {/* Add Dataset Modal Overlay */}
      <Dialog open={showAddDatasetModal} onOpenChange={setShowAddDatasetModal}>
        <DialogContent className="bg-[#131315] border border-[#1F1F23] rounded-xl w-full max-w-md overflow-hidden shadow-2xl p-0 text-[#e5e1e4]">
          <DialogHeader className="p-4 border-b border-[#1F1F23] flex justify-between items-center bg-[#141416] flex-row space-y-0">
            <DialogTitle className="text-sm font-bold text-[#e5e1e4] flex items-center">
              <Sparkles className="w-4 h-4 text-[#3192fc] mr-1.5" />
              Register Dataset Asset
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                Dataset Name
              </label>
              <Input
                type="text"
                value={newDatasetName}
                onChange={(e) => setNewDatasetName(e.target.value)}
                placeholder="e.g. users_activity_log"
                className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                  Disk Size
                </label>
                <Input
                  type="text"
                  value={newDatasetSize}
                  onChange={(e) => setNewDatasetSize(e.target.value)}
                  placeholder="e.g. 42.5 MB, 1.2 GB"
                  className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                  Row Cardinality
                </label>
                <Input
                  type="text"
                  value={newDatasetRows}
                  onChange={(e) => setNewDatasetRows(e.target.value)}
                  placeholder="e.g. 150,000 rows"
                  className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#c0c7d5]/70 block mb-1">
                File Format
              </label>
              <Select
                value={newDatasetFormat}
                onValueChange={(val) => setNewDatasetFormat(val as 'csv' | 'parquet' | 'json')}
              >
                <SelectTrigger className="w-full bg-[#050505] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#3192fc] h-9 focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent className="bg-[#131315] border border-[#1F1F23] text-xs text-[#e5e1e4]">
                  <SelectItem value="parquet">Apache Parquet (Columnar - Recommended)</SelectItem>
                  <SelectItem value="csv">Comma-Separated Values (CSV)</SelectItem>
                  <SelectItem value="json">Structured JSON Records</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="p-4 bg-[#141416] border-t border-[#1F1F23] flex justify-end space-x-2 sm:space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowAddDatasetModal(false)}
              className="bg-transparent hover:bg-[#353437] text-[#c0c7d5] hover:text-[#c0c7d5] hover:bg-[#353437] px-3 py-1.5 rounded-lg text-xs cursor-pointer border border-[#1f1f23] h-8"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDataset}
              disabled={!newDatasetName.trim()}
              className="bg-[#3192fc] hover:bg-[#3192fc]/90 hover:brightness-110 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer h-8"
            >
              Register Data Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
