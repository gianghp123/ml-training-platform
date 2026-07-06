import type { BlockDefinition } from '@/lib/models';
import type { BlockConfigField } from '../socket-types';

const commonInputSchema = {
    entries: [
        { id: 'model', type: 'model', label: 'Trained Model' },
        { id: 'dataset', type: 'dataset', label: 'Test Dataset' },
    ],
} as Record<string, unknown>;

const commonOutputSchema = {
    entries: [
        { id: 'metrics', type: 'metrics', label: 'Evaluation Metrics' },
    ],
} as Record<string, unknown>;

export const ClassificationMetricsBlock: BlockDefinition = {
    id: "classification_metrics",
    code: "classification_metrics",
    name: "Classification Metrics",
    categoryId: "evaluate",
    description: "Tính toán các chỉ số đánh giá phân loại phổ biến như Accuracy, Precision, Recall, F1-score.",
    configSchema: {
        average: {
            type: "select",
            label: "Phương pháp tính trung bình",
            default: "binary",
            options: [
                { label: "Nhị phân", value: "binary" },
                { label: "Macro Average", value: "macro" },
                { label: "Weighted Average", value: "weighted" },
                { label: "Micro Average", value: "micro" },
            ],
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: commonInputSchema,
    outputSchema: commonOutputSchema,
}

export const ConfusionMatrixBlock: BlockDefinition = {
    id: "confusion_matrix",
    code: "confusion_matrix",
    name: "Confusion Matrix",
    categoryId: "evaluate",
    description: "Trực quan hóa ma trận nhầm lẫn để phân tích chi tiết kết quả dự báo của các lớp.",
    configSchema: {
        normalize: {
            type: "select",
            label: "Chuẩn hóa ma trận",
            default: "none",
            options: [
                { label: "Không chuẩn hóa", value: "none" },
                { label: "Chuẩn hóa theo hàng", value: "true" },
                { label: "Chuẩn hóa theo cột", value: "pred" },
                { label: "Chuẩn hóa toàn bộ", value: "all" },
            ],
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: commonInputSchema,
    outputSchema: commonOutputSchema,
}

export const RocAucCurveBlock: BlockDefinition = {
    id: "roc_auc_curve",
    code: "roc_auc_curve",
    name: "ROC-AUC Curve",
    categoryId: "evaluate",
    description: "Vẽ đường cong ROC và tính toán chỉ số diện tích dưới đường cong AUC.",
    configSchema: {
        pos_label: {
            type: "text",
            label: "Nhãn lớp dương tính",
            default: "1",
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: commonInputSchema,
    outputSchema: commonOutputSchema,
}
