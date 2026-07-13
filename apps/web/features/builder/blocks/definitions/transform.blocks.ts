import type { BlockDefinition } from '@training-ml/contracts';
import type { BlockConfigField } from '../socket-types';

export const NormalizeBlock: BlockDefinition = {
  id: 'normalize',
  code: 'normalize',
  name: 'Normalize',
  categoryId: 'transform',
  description: 'Apply normalization to dataset features',
  dockerImage: '',
  version: '1.0.0',
  configSchema: {
    method: {
      type: 'select',
      label: 'Method',
      default: 'minmax',
      options: [
        { label: 'Min-Max', value: 'minmax' },
        { label: 'Z-Score', value: 'zscore' },
      ],
    } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: {
    entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' }],
  } as Record<string, unknown>,
  outputSchema: {
    entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' }],
  } as Record<string, unknown>,
};

export const AugmentBlock: BlockDefinition = {
  id: 'augment',
  code: 'augment',
  name: 'Augment',
  categoryId: 'transform',
  description: 'Apply data augmentation',
  dockerImage: '',
  version: '1.0.0',
  configSchema: {
    rotation: { type: 'switch', label: 'Rotation', default: false } satisfies BlockConfigField,
    flip: { type: 'switch', label: 'Horizontal Flip', default: false } satisfies BlockConfigField,
    brightness: { type: 'number', label: 'Brightness', default: 0.1, validation: { min: 0, max: 1, step: 0.01 } } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: {
    entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' }],
  } as Record<string, unknown>,
  outputSchema: {
    entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' }],
  } as Record<string, unknown>,
};

export const FilterBlock: BlockDefinition = {
  id: 'filter',
  code: 'filter',
  name: 'Filter',
  categoryId: 'transform',
  description: 'Filter dataset rows by condition',
  dockerImage: '',
  version: '1.0.0',
  configSchema: {
    column: { type: 'text', label: 'Column', default: '', validation: { required: true } } satisfies BlockConfigField,
    operator: {
      type: 'select',
      label: 'Operator',
      default: 'eq',
      options: [
        { label: 'Equals', value: 'eq' },
        { label: 'Greater Than', value: 'gt' },
        { label: 'Less Than', value: 'lt' },
      ],
    } satisfies BlockConfigField,
    value: { type: 'text', label: 'Value', default: '', validation: { required: true } } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: {
    entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' }],
  } as Record<string, unknown>,
  outputSchema: {
    entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' }],
  } as Record<string, unknown>,
};
