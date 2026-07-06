import type { BlockDefinition } from '@/lib/models';
import type { BlockConfigField } from '../socket-types';

export const SaveModelBlock: BlockDefinition = {
    id: "save_model",
    code: "save_model",
    name: "Save Model",
    categoryId: "export",
    description: "Lưu trữ mô hình đã huấn luyện vào registry của hệ thống kèm theo các phiên bản và metadata.",
    configSchema: {
        model_name: {
            type: "text",
            label: "Tên mô hình",
            validation: { required: true },
        } satisfies BlockConfigField,
        version: {
            type: "text",
            label: "Phiên bản",
            default: "v1.0.0",
            validation: { required: true },
        } satisfies BlockConfigField,
        save_format: {
            type: "select",
            label: "Định dạng lưu trữ",
            default: "pickle",
            options: [
                { label: "Pickle", value: "pickle" },
                { label: "ONNX", value: "onnx" },
                { label: "Keras/TensorFlow", value: "keras" },
            ],
        } satisfies BlockConfigField,
        description: {
            type: "textarea",
            label: "Mô tả chi tiết",
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [
            { id: "model", type: "model", label: "Trained Model" },
            { id: "metrics", type: "metrics", label: "Optional Metrics", optional: true },
        ],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [],
    } as Record<string, unknown>,
}

export const ExportDatasetBlock: BlockDefinition = {
    id: "export_dataset",
    code: "export_dataset",
    name: "Export Dataset",
    categoryId: "export",
    description: "Xuất dữ liệu đã xử lý ra các định dạng tệp thông dụng để tải xuống hoặc lưu trữ.",
    configSchema: {
        format: {
            type: "select",
            label: "Định dạng xuất",
            default: "csv",
            options: [
                { label: "CSV", value: "csv" },
                { label: "JSON", value: "json" },
                { label: "Excel", value: "xlsx" },
                { label: "Parquet", value: "parquet" },
            ],
            validation: { required: true },
        } satisfies BlockConfigField,
        file_name: {
            type: "text",
            label: "Tên tệp xuất ra",
            default: "exported_dataset",
            validation: { required: true },
        } satisfies BlockConfigField,
        include_index: {
            type: "switch",
            label: "Bao gồm cột chỉ mục",
            default: false,
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [
            { id: "dataset", type: "dataset", label: "Dataset đầu vào" },
        ],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [],
    } as Record<string, unknown>,
}

export const LogMetricsBlock: BlockDefinition = {
    id: "log_metrics",
    code: "log_metrics",
    name: "Log Metrics",
    categoryId: "export",
    description: "Ghi nhận các chỉ số đánh giá lên bảng điều khiển Dashboard phục vụ giám sát.",
    configSchema: {
        run_name: {
            type: "text",
            label: "Tên lượt chạy",
            default: "run_1",
            validation: { required: true },
        } satisfies BlockConfigField,
        log_to_mlflow: {
            type: "switch",
            label: "Đồng bộ lên MLflow tracking",
            default: false,
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [
            { id: "metrics", type: "metrics", label: "Evaluation Metrics" },
        ],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [],
    } as Record<string, unknown>,
}
