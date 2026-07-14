import type { BlockDefinition, BlockPort } from '@/lib/models';
import type { BlockConfigField } from '../socket-types';

const splitPorts: BlockPort[] = [
    { id: 'dataset', label: 'Dataset', direction: 'input', artifact: 'Dataset', required: true, multiple: false },
    { id: 'train_dataset', label: 'Train Dataset', direction: 'output', artifact: 'Dataset', required: true, multiple: true },
    { id: 'test_dataset', label: 'Test Dataset', direction: 'output', artifact: 'Dataset', required: true, multiple: true },
];

const kFoldPorts: BlockPort[] = [
    { id: 'dataset', label: 'Dataset', direction: 'input', artifact: 'Dataset', required: true, multiple: false },
    { id: 'folds', label: 'Folds', direction: 'output', artifact: 'Folds', required: true, multiple: true },
];

export const TrainTestSplitBlock: BlockDefinition = {
    id: "train_test_split",
    code: "train_test_split",
    name: "Train/Test Split",
    categoryId: "split_data",
    description: "Chia dataset thành 2 phần Train và Test theo tỉ lệ chỉ định.",
    configSchema: {
        target_column: {
            type: "text",
            label: "Cột mục tiêu",
            validation: { required: true },
        } satisfies BlockConfigField,
        train_ratio: {
            type: "number",
            label: "Tỉ lệ tập Train",
            default: 0.8,
            validation: { min: 0, max: 1, step: 0.01 },
        } satisfies BlockConfigField,
        random_state: {
            type: "number",
            label: "Random State",
            default: 42,
            validation: { min: 0 },
        } satisfies BlockConfigField,
        shuffle: {
            type: "switch",
            label: "Xáo trộn dữ liệu trước khi chia",
            default: true,
        } satisfies BlockConfigField,
    },
    portSchema: { ports: splitPorts },
}

export const KFoldSplitBlock: BlockDefinition = {
    id: "k_fold_split",
    code: "k_fold_split",
    name: "K-Fold Split",
    categoryId: "split_data",
    description: "Chia dataset thành K phần để phục vụ cho việc đánh giá Cross Validation.",
    configSchema: {
        target_column: {
            type: "text",
            label: "Cột mục tiêu",
            validation: { required: true },
        } satisfies BlockConfigField,
        n_splits: {
            type: "number",
            label: "Số fold",
            default: 5,
            validation: { required: true, min: 2, max: 50 },
        } satisfies BlockConfigField,
        random_state: {
            type: "number",
            label: "Random State",
            default: 42,
            validation: { min: 0 },
        } satisfies BlockConfigField,
        shuffle: {
            type: "switch",
            label: "Xáo trộn dữ liệu trước khi chia",
            default: true,
        } satisfies BlockConfigField,
    },
    portSchema: { ports: kFoldPorts },
}

export const StratifiedSplitBlock: BlockDefinition = {
    id: "stratified_split",
    code: "stratified_split",
    name: "Stratified Split",
    categoryId: "split_data",
    description: "Chia dataset thành Train/Test sao cho tỉ lệ các lớp của cột phân loại ở 2 tập vẫn giữ nguyên.",
    configSchema: {
        stratify_column: {
            type: "text",
            label: "Cột phân loại",
            validation: { required: true },
        } satisfies BlockConfigField,
        test_ratio: {
            type: "number",
            label: "Tỉ lệ tập Test",
            default: 0.2,
            validation: { min: 0, max: 1, step: 0.01 },
        } satisfies BlockConfigField,
        random_state: {
            type: "number",
            label: "Random State",
            default: 42,
            validation: { min: 0 },
        } satisfies BlockConfigField,
        shuffle: {
            type: "switch",
            label: "Xáo trộn dữ liệu trước khi chia",
            default: true,
        } satisfies BlockConfigField,
    },
    portSchema: { ports: splitPorts },
}
