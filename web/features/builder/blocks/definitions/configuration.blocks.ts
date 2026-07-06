import type { BlockDefinition } from '@/lib/models';
import type { BlockConfigField } from '../socket-types';

export const HyperparametersBlock: BlockDefinition = {
    id: "hyperparameters",
    code: "hyperparameters",
    name: "Set Hyperparameters",
    categoryId: "config",
    description: "Thiết lập các siêu tham số cho quá trình huấn luyện (Learning rate, Epochs, Batch size, Optimizer...).",
    configSchema: {
        learning_rate: {
            type: "number",
            label: "Learning Rate",
            default: 0.001,
            validation: { required: true, min: 0.00001, max: 1.0, step: 0.0001 },
        } satisfies BlockConfigField,
        epochs: {
            type: "number",
            label: "Epochs",
            default: 10,
            validation: { required: true, min: 1, max: 10000 },
        } satisfies BlockConfigField,
        batch_size: {
            type: "number",
            label: "Batch Size",
            default: 32,
            validation: { required: true, min: 1, max: 4096 },
        } satisfies BlockConfigField,
        optimizer: {
            type: "select",
            label: "Optimizer (Thuật toán tối ưu)",
            default: "adam",
            options: [
                { label: "Adam", value: "adam" },
                { label: "SGD", value: "sgd" },
                { label: "RMSprop", value: "rmsprop" },
                { label: "AdamW", value: "adamw" },
            ],
        } satisfies BlockConfigField,
        weight_decay: {
            type: "number",
            label: "Weight Decay (L2)",
            default: 0.0001,
            validation: { min: 0 },
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [
            { id: "config", type: "config", label: "Hyperparameters Config" },
        ],
    } as Record<string, unknown>,
}

export const LossFunctionBlock: BlockDefinition = {
    id: "loss_function",
    code: "loss_function",
    name: "Loss Function Selection",
    categoryId: "config",
    description: "Lựa chọn hàm mất mát (Loss function) phù hợp với loại bài toán.",
    configSchema: {
        task_type: {
            type: "select",
            label: "Loại bài toán",
            default: "classification",
            options: [
                { label: "Phân loại (Classification)", value: "classification" },
                { label: "Hồi quy (Regression)", value: "regression" },
            ],
            validation: { required: true },
        } satisfies BlockConfigField,
        loss_classification: {
            type: "select",
            label: "Hàm loss cho Phân loại",
            default: "cross_entropy",
            options: [
                { label: "Cross Entropy Loss", value: "cross_entropy" },
                { label: "Binary Cross Entropy Loss", value: "binary_cross_entropy" },
                { label: "Focal Loss", value: "focal" },
            ],
        } satisfies BlockConfigField,
        loss_regression: {
            type: "select",
            label: "Hàm loss cho Hồi quy",
            default: "mse",
            options: [
                { label: "Mean Squared Error (MSE)", value: "mse" },
                { label: "Mean Absolute Error (MAE)", value: "mae" },
                { label: "Huber Loss", value: "huber" },
            ],
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [
            { id: "config", type: "config", label: "Loss Config" },
        ],
    } as Record<string, unknown>,
}

export const EarlyStoppingBlock: BlockDefinition = {
    id: "early_stopping",
    code: "early_stopping",
    name: "Early Stopping",
    categoryId: "config",
    description: "Cấu hình tự động dừng huấn luyện sớm khi metric trên tập validation không còn cải thiện.",
    configSchema: {
        monitor: {
            type: "select",
            label: "Chỉ số theo dõi (Monitor)",
            default: "val_loss",
            options: [
                { label: "Validation Loss", value: "val_loss" },
                { label: "Validation Accuracy", value: "val_accuracy" },
                { label: "Training Loss", value: "train_loss" },
            ],
            validation: { required: true },
        } satisfies BlockConfigField,
        patience: {
            type: "number",
            label: "Patience (Số epoch chờ)",
            default: 5,
            validation: { required: true, min: 1 },
        } satisfies BlockConfigField,
        min_delta: {
            type: "number",
            label: "Mức cải thiện tối thiểu (Min Delta)",
            default: 0.0001,
            validation: { min: 0 },
        } satisfies BlockConfigField,
        restore_best_weights: {
            type: "switch",
            label: "Khôi phục trọng số tốt nhất",
            default: true,
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [
            { id: "config", type: "config", label: "Early Stopping Config" },
        ],
    } as Record<string, unknown>,
}
