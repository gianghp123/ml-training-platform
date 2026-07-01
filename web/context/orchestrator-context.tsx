'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Pipeline, Dataset, MLModel, LogEntry } from '@/types';

interface OrchestratorContextType {
  pipelines: Pipeline[];
  datasets: Dataset[];
  models: MLModel[];
  logs: LogEntry[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeSubTab: string;
  setActiveSubTab: (subTab: string) => void;
  createPipeline: () => Pipeline;
  deletePipeline: (id: string) => void;
  updatePipeline: (updated: Pipeline) => void;
  addDataset: (dataset: Dataset) => void;
  deleteDataset: (id: string) => void;
  addModel: (model: MLModel) => void;
  deleteModel: (id: string) => void;
  clearLogs: () => void;
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
}

const OrchestratorContext = createContext<OrchestratorContextType | undefined>(undefined);

export function OrchestratorProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<string>('recent');

  // Pre-populated Pipelines (Matching User Screenshot)
  const [pipelines, setPipelines] = useState<Pipeline[]>([
    {
      id: 'pipe-fraud',
      name: 'Fraud_Detection_V2',
      status: 'success',
      nodeCount: 4,
      updatedTime: 'Updated 2 hours ago',
      createdTime: 'Created 3 days ago',
      description: 'Production pipeline to score real-time credit transactions against card counterfeiting trees.',
      nodes: [
        { id: 'fn-1', name: 'Ingest_Fraud_Data', type: 'ingestion', status: 'success', duration: '12s', description: 'Loads raw transactional Parquet shards from GCS clusters.' },
        { id: 'fn-2', name: 'Standardize_Scales', type: 'preprocessing', status: 'success', duration: '2.5s', description: 'Aligns numerical currencies and standardizes transaction weights.' },
        { id: 'fn-3', name: 'XGBoost_Train', type: 'training', status: 'success', duration: '45s', description: 'Fits XGBoost decision trees over 200 epochs on GPU.' },
        { id: 'fn-4', name: 'Register_Service', type: 'deploy', status: 'success', duration: '1.4s', description: 'Registers staging API predict endpoints.' }
      ]
    },
    {
      id: 'pipe-nlp',
      name: 'NLP_Transformer_Train',
      status: 'error',
      nodeCount: 5,
      updatedTime: 'Updated 5 mins ago',
      createdTime: 'Created 1 day ago',
      description: 'Fine-tuning NLP transformer encoder representations for support ticket triage categories.',
      nodes: [
        { id: 'nn-1', name: 'Read_Text_Corpus', type: 'ingestion', status: 'success', duration: '15s', description: 'Queries text datasets from central BigQuery tables.' },
        { id: 'nn-2', name: 'Tokenizer_Vocab', type: 'preprocessing', status: 'success', duration: '8.4s', description: 'Initializes WordPiece vocabulary maps and token splits.' },
        { id: 'nn-3', name: 'FineTune_BERT', type: 'training', status: 'error', duration: '14.5s', description: 'Pre-trains deep BERT layer weights. Halted on NaN loss.' },
        { id: 'nn-4', name: 'Validation_Eval', type: 'evaluation', status: 'idle', description: 'Computes F1 precision rates on dev splits.' },
        { id: 'nn-5', name: 'Deploy_Cloud_Run', type: 'deploy', status: 'idle', description: 'Packages model weights to Docker images.' }
      ]
    },
    {
      id: 'pipe-churn',
      name: 'Customer_Churn_Draft',
      status: 'never_run',
      nodeCount: 3,
      updatedTime: 'Created 2 days ago',
      createdTime: 'Created 2 days ago',
      description: 'Draft model to analyze churn factors from subscriber monthly rates and contract types.',
      nodes: [
        { id: 'cn-1', name: 'Query_Churn_DB', type: 'ingestion', status: 'idle', description: 'Downloads customer subscription histories.' },
        { id: 'cn-2', name: 'Handle_Nulls', type: 'preprocessing', status: 'idle', description: 'Resolves missing internet contracts and variables.' },
        { id: 'cn-3', name: 'Logistic_Regression', type: 'training', status: 'idle', description: 'Fits light regression boundaries to model classification.' }
      ]
    }
  ]);

  // Pre-populated Datasets
  const [datasets, setDatasets] = useState<Dataset[]>([
    { id: 'ds-1', name: 'fraud_dataset_parquet', size: '82.4 MB', format: 'parquet', rows: '1,200,500 rows', status: 'ready', updatedTime: 'Synced 2 hours ago' },
    { id: 'ds-2', name: 'customer_churn_csv', size: '12.8 MB', format: 'csv', rows: '240,000 rows', status: 'ready', updatedTime: 'Synced 1 day ago' },
    { id: 'ds-3', name: 'raw_corpus_unstructured', size: '425.1 MB', format: 'json', rows: '4,500,000 logs', status: 'ready', updatedTime: 'Synced 5 mins ago' }
  ]);

  // Pre-populated Models
  const [models, setModels] = useState<MLModel[]>([
    { id: 'md-1', name: 'Fraud_XGBoost_V2', version: 'v2.4.0-release', accuracy: 0.945, f1Score: 0.931, status: 'active', framework: 'XGBoost', type: 'Binary Classifier', updatedTime: 'Released 2 hours ago' },
    { id: 'md-2', name: 'Transformer_NLP_BERT', version: 'v1.0.1-draft', accuracy: 0.924, f1Score: 0.918, status: 'active', framework: 'PyTorch', type: 'NLP Transformer', updatedTime: 'Trained 1 day ago' }
  ]);

  // Pre-populated log stream
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'l-1', timestamp: '02:15:32', level: 'info', message: 'Orchestrator engine boot sequence success.', source: 'Orchestrator' },
    { id: 'l-2', timestamp: '02:15:35', level: 'success', message: 'Connected to GPC staging cluster on zone us-central1-a', source: 'ComputeNode' },
    { id: 'l-3', timestamp: '02:16:01', level: 'info', message: 'Checking resource boundaries. CPU Load: 12.4%, Active VRAM: 0.0 GB', source: 'ComputeNode' },
    { id: 'l-4', timestamp: '02:20:14', level: 'info', message: 'Pipeline Fraud_Detection_V2 manual compile trigger received.', source: 'Orchestrator', pipelineId: 'pipe-fraud' },
    { id: 'l-5', timestamp: '02:20:16', level: 'info', message: 'Mounting Parquet volume at path /data/fraud_shards', source: 'Database', pipelineId: 'pipe-fraud' },
    { id: 'l-6', timestamp: '02:20:32', level: 'success', message: 'Dataset ingestion complete: Read 1,200,500 lines in 12.0s', source: 'ComputeNode', pipelineId: 'pipe-fraud' },
    { id: 'l-7', timestamp: '02:20:45', level: 'success', message: 'XGBoost neural training fitted. Accuracy: 94.5%, Loss: 0.124', source: 'ComputeNode', pipelineId: 'pipe-fraud' },
    { id: 'l-8', timestamp: '02:21:00', level: 'success', message: 'Deploy endpoint registered cleanly. Route path: v1/predict/pipe-fraud', source: 'Orchestrator', pipelineId: 'pipe-fraud' }
  ]);

  const createPipeline = () => {
    const id = `pipe-${Date.now()}`;
    const name = `ML_Workflow_${Math.floor(Math.random() * 900 + 100)}`;
    const newPipeline: Pipeline = {
      id,
      name,
      status: 'never_run',
      nodeCount: 3,
      updatedTime: 'Created just now',
      createdTime: 'Created just now',
      description: 'Autogenerated ML training template ready to design.',
      nodes: [
        { id: `fn-${id}-1`, name: 'Ingest_Raw_Data', type: 'ingestion', status: 'idle', description: 'Reads training files.' },
        { id: `fn-${id}-2`, name: 'Preprocess_Features', type: 'preprocessing', status: 'idle', description: 'Handles data scaling.' },
        { id: `fn-${id}-3`, name: 'Train_Neural_Net', type: 'training', status: 'idle', description: 'Fits network weights on GPU.' }
      ]
    };

    setPipelines(prev => [newPipeline, ...prev]);

    // Add log
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [
      { id: `log-${Date.now()}`, timestamp, level: 'success', message: `Registered new pipeline: ${name}`, source: 'Orchestrator', pipelineId: id },
      ...prev
    ]);

    return newPipeline;
  };

  const deletePipeline = (id: string) => {
    setPipelines(prev => prev.filter(p => p.id !== id));
  };

  const updatePipeline = (updatedPipeline: Pipeline) => {
    setPipelines(prev => prev.map(p => p.id === updatedPipeline.id ? updatedPipeline : p));
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const addDataset = (dataset: Dataset) => {
    setDatasets(prev => [dataset, ...prev]);
    // Log trace
    setLogs(prev => [
      { id: `log-${Date.now()}`, timestamp: new Date().toLocaleTimeString(), level: 'success', message: `Dataset logged: ${dataset.name}`, source: 'Database' },
      ...prev
    ]);
  };

  const deleteDataset = (id: string) => {
    setDatasets(prev => prev.filter(d => d.id !== id));
  };

  const addModel = (model: MLModel) => {
    setModels(prev => [model, ...prev]);
    // Log trace
    setLogs(prev => [
      { id: `log-${Date.now()}`, timestamp: new Date().toLocaleTimeString(), level: 'success', message: `Neural weights registered: ${model.name}`, source: 'Orchestrator' },
      ...prev
    ]);
  };

  const deleteModel = (id: string) => {
    setModels(prev => prev.filter(m => m.id !== id));
  };

  return (
    <OrchestratorContext.Provider
      value={{
        pipelines,
        datasets,
        models,
        logs,
        searchQuery,
        setSearchQuery,
        activeSubTab,
        setActiveSubTab,
        createPipeline,
        deletePipeline,
        updatePipeline,
        addDataset,
        deleteDataset,
        addModel,
        deleteModel,
        clearLogs,
        setLogs,
      }}
    >
      {children}
    </OrchestratorContext.Provider>
  );
}

export function useOrchestrator() {
  const context = useContext(OrchestratorContext);
  if (context === undefined) {
    throw new Error('useOrchestrator must be used within an OrchestratorProvider');
  }
  return context;
}
