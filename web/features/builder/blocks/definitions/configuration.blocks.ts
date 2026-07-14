import type { BlockDefinition } from '@/lib/models';
import type { BlockConfigField } from '../socket-types';

export const HyperparametersBlock: BlockDefinition = {
    id: "hyperparameters",
    code: "hyperparameters",
    name: "Set Hyperparameters",
    categoryId: "config",
    description: "Thiết lập các siêu tham số cho quá trình huấn luyện.",
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
            label: "Thuật toán tối ưu",
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
            label: "Weight Decay",
            default: 0.0001,
            validation: { min: 0 },
        } satisfies BlockConfigField,
    },
    portSchema: { ports: [
      { id: "hyperparameters", label: "Hyperparameters", direction: "output", artifact: "Hyperparameters", required: true, multiple: true }
    ] },
}

export const LossFunctionBlock: BlockDefinition = {
    id: "loss_function",
    code: "loss_function",
    name: "Loss Function Selection",
    categoryId: "config",
    description: "Lựa chọn hàm mất mát phù hợp với loại bài toán.",
    configSchema: {
        task_type: {
            type: "select",
            label: "Loại bài toán",
            default: "classification",
            options: [
                { label: "Phân loại", value: "classification" },
                { label: "Hồi quy", value: "regression" },
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
                { label: "Mean Squared Error", value: "mse" },
                { label: "Mean Absolute Error", value: "mae" },
                { label: "Huber Loss", value: "huber" },
            ],
        } satisfies BlockConfigField,
    },
    portSchema: { ports: [
      { id: "loss_config", label: "Loss Config", direction: "output", artifact: "LossConfig", required: true, multiple: true }
    ] },
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
            label: "Chỉ số theo dõi",
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
            label: "Số epoch chờ",
            default: 5,
            validation: { required: true, min: 1 },
        } satisfies BlockConfigField,
        min_delta: {
            type: "number",
            label: "Mức cải thiện tối thiểu",
            default: 0.0001,
            validation: { min: 0 },
        } satisfies BlockConfigField,
        restore_best_weights: {
            type: "switch",
            label: "Khôi phục trọng số tốt nhất",
            default: true,
        } satisfies BlockConfigField,
    },
    portSchema: { ports: [
      { id: "early_stopping_config", label: "Early Stopping Config", direction: "output", artifact: "EarlyStoppingConfig", required: true, multiple: true }
    ] },
}
