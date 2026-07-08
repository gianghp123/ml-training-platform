import type { BlockDefinition } from '@/lib/models';
import type { BlockConfigField } from '../socket-types';

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
    inputSchema: [],
    outputSchema: [],
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
    inputSchema: [],
    outputSchema: [],
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
    inputSchema: [],
    outputSchema: [],
}

export const ClassificationReportBlock: BlockDefinition = {
    id: "classification_report",
    code: "classification_report",
    name: "Classification Report",
    categoryId: "evaluate",
    description: "Xuất bảng Precision, Recall, F1-score và Support cho từng class.",
    configSchema: {
        digits: {
            type: "number",
            label: "Số chữ số thập phân",
            default: 2,
            validation: { min: 0, max: 10 },
        } satisfies BlockConfigField,
        zero_division: {
            type: "select",
            label: "Giá trị khi phép chia cho 0",
            default: "0",
            options: [
                { label: "Gán bằng 0", value: "0" },
                { label: "Gán bằng 1", value: "1" },
                { label: "Không xác định", value: "nan" },
            ],
        } satisfies BlockConfigField,
        include_averages: {
            type: "switch",
            label: "Bao gồm Macro/Weighted Average",
            default: true,
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: [],
    outputSchema: [],
}

export const PredictionResultBlock: BlockDefinition = {
    id: "prediction_result",
    code: "prediction_result",
    name: "Prediction Results",
    categoryId: "evaluate",
    description: "Xuất bảng kết quả gồm giá trị thực tế, dự đoán, xác suất và sai số.",
    configSchema: {
        target_column: {
            type: "text",
            label: "Tên cột nhãn thực tế",
            validation: { required: true },
        } satisfies BlockConfigField,
        include_probability: {
            type: "switch",
            label: "Bao gồm xác suất dự đoán",
            default: true,
        } satisfies BlockConfigField,
        error_method: {
            type: "select",
            label: "Cách tính sai số",
            default: "auto",
            options: [
                { label: "Tự động theo loại bài toán", value: "auto" },
                { label: "Sai khác tuyệt đối", value: "absolute" },
                { label: "Sai số bình phương", value: "squared" },
                { label: "Dự đoán sai/đúng", value: "mismatch" },
            ],
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: [],
    outputSchema: [],
}

export const CrossValidationBlock: BlockDefinition = {
    id: "cross_validation",
    code: "cross_validation",
    name: "Cross Validation",
    categoryId: "evaluate",
    description: "Chạy K-fold cross-validation và tính giá trị trung bình, độ lệch chuẩn của score.",
    configSchema: {
        folds: {
            type: "number",
            label: "Số fold",
            default: 5,
            validation: { required: true, min: 2 },
        } satisfies BlockConfigField,
        scoring: {
            type: "select",
            label: "Chỉ số đánh giá",
            default: "accuracy",
            options: [
                { label: "Accuracy", value: "accuracy" },
                { label: "Precision", value: "precision" },
                { label: "Recall", value: "recall" },
                { label: "F1-score", value: "f1" },
                { label: "ROC-AUC", value: "roc_auc" },
                { label: "R²", value: "r2" },
                { label: "Mean Squared Error", value: "neg_mean_squared_error" },
            ],
            validation: { required: true },
        } satisfies BlockConfigField,
        shuffle: {
            type: "switch",
            label: "Trộn dữ liệu trước khi chia fold",
            default: true,
        } satisfies BlockConfigField,
        random_state: {
            type: "number",
            label: "Random state",
            default: 42,
        } satisfies BlockConfigField,
        stratified: {
            type: "switch",
            label: "Giữ tỷ lệ class giữa các fold",
            default: true,
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: [],
    outputSchema: [],
}
