import type { BlockDefinition } from '@/lib/models';
import type { BlockConfigField } from '../socket-types';

export const FeatureSelectionBlock: BlockDefinition = {
    id: "feature_selection",
    code: "feature_selection",
    name: "Feature Selection",
    categoryId: "transform",
    description: "Lựa chọn các cột đặc trưng quan trọng nhất dựa trên các phương pháp thống kê hoặc mô hình.",
    configSchema: {
        method: {
            type: "select",
            label: "Phương pháp lựa chọn",
            default: "select_k_best",
            options: [
                { label: "Select K Best", value: "select_k_best" },
                { label: "Recursive Feature Elimination", value: "rfe" },
                { label: "Variance Threshold", value: "variance_threshold" },
            ],
            validation: { required: true },
        } satisfies BlockConfigField,
        k_features: {
            type: "number",
            label: "Số lượng đặc trưng cần giữ lại",
            default: 10,
            validation: { min: 1 },
        } satisfies BlockConfigField,
        threshold: {
            type: "number",
            label: "Ngưỡng phương sai tối thiểu",
            default: 0.0,
            validation: { min: 0 },
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' }],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' }],
    } as Record<string, unknown>,
}

export const PCABlock: BlockDefinition = {
    id: "pca_dimension_reduction",
    code: "pca_dimension_reduction",
    name: "PCA / Giảm chiều dữ liệu",
    categoryId: "transform",
    description: "Sử dụng Principal Component Analysis để giảm số chiều của dataset nhưng vẫn giữ tối đa lượng thông tin.",
    configSchema: {
        n_components: {
            type: "number",
            label: "Số lượng chiều đầu ra",
            default: 2,
            validation: { required: true, min: 0.01 },
        } satisfies BlockConfigField,
        whiten: {
            type: "switch",
            label: "Làm trắng dữ liệu",
            default: false,
        } satisfies BlockConfigField,
        svd_solver: {
            type: "select",
            label: "Bộ giải SVD",
            default: "auto",
            options: [
                { label: "Tự động", value: "auto" },
                { label: "Toàn bộ SVD", value: "full" },
                { label: "Ngẫu nhiên", value: "randomized" },
            ],
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' }],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' }],
    } as Record<string, unknown>,
}

export const CreateNewFeatureBlock: BlockDefinition = {
    id: "create_new_feature",
    code: "create_new_feature",
    name: "Tạo đặc trưng mới",
    categoryId: "transform",
    description: "Tạo ra cột mới từ các cột hiện có bằng các biểu thức toán học hoặc kết hợp chuỗi.",
    configSchema: {
        new_column_name: {
            type: "text",
            label: "Tên cột mới",
            validation: { required: true },
        } satisfies BlockConfigField,
        formula: {
            type: "textarea",
            label: "Biểu thức tính toán",
            validation: { required: true },
        } satisfies BlockConfigField,
        result_type: {
            type: "select",
            label: "Kiểu dữ liệu cột mới",
            default: "numeric",
            options: [
                { label: "Số", value: "numeric" },
                { label: "Chuỗi", value: "categorical" },
                { label: "Boolean", value: "boolean" },
            ],
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' }],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' }],
    } as Record<string, unknown>,
}
