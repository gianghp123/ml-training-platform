import type { BlockDefinition, BlockPort } from '@/lib/models';
import type { BlockConfigField } from '../socket-types';

const transformPorts: BlockPort[] = [
    { id: 'dataset_in', label: 'Dataset', direction: 'input', artifact: 'Dataset', required: true, multiple: false },
    { id: 'dataset_out', label: 'Dataset', direction: 'output', artifact: 'Dataset', required: true, multiple: true },
];

export const FeatureSelectionBlock: BlockDefinition = {
    id: "feature_selection",
    code: "feature_selection",
    name: "Feature Selection",
    categoryId: "transform",
    description: "Chọn lọc các đặc trưng quan trọng nhất dựa trên điểm số thống kê hoặc mô hình.",
    configSchema: {
        method: {
            type: "select",
            label: "Phương pháp lựa chọn",
            default: "k_best",
            options: [
                { label: "Select K Best", value: "k_best" },
                { label: "Recursive Feature Elimination (RFE)", value: "rfe" },
                { label: "Lựa chọn theo độ quan trọng đặc trưng", value: "importance" },
            ],
            validation: { required: true },
        } satisfies BlockConfigField,
        k_features: {
            type: "number",
            label: "Số đặc trưng cần giữ lại (k)",
            default: 10,
            validation: { min: 1 },
        } satisfies BlockConfigField,
        threshold: {
            type: "text",
            label: "Ngưỡng độ quan trọng tối thiểu",
            default: "median",
        } satisfies BlockConfigField,
    },
    portSchema: { ports: transformPorts },
}

export const PCABlock: BlockDefinition = {
    id: "pca",
    code: "pca",
    name: "PCA (Principal Component Analysis)",
    categoryId: "transform",
    description: "Giảm số chiều dữ liệu bằng phương pháp phân tích thành phần chính.",
    configSchema: {
        n_components: {
            type: "number",
            label: "Số thành phần chính giữ lại",
            default: 2,
            validation: { min: 1 },
        } satisfies BlockConfigField,
        whiten: {
            type: "switch",
            label: "Làm trắng dữ liệu (whitening)",
            default: false,
        } satisfies BlockConfigField,
        svd_solver: {
            type: "select",
            label: "Thuật toán SVD",
            default: "auto",
            options: [
                { label: "Tự động", value: "auto" },
                { label: "Full SVD", value: "full" },
                { label: "Randomized SVD", value: "randomized" },
            ],
        } satisfies BlockConfigField,
    },
    portSchema: { ports: transformPorts },
}

export const CreateNewFeatureBlock: BlockDefinition = {
    id: "create_new_feature",
    code: "create_new_feature",
    name: "Create New Feature",
    categoryId: "transform",
    description: "Tạo cột đặc trưng mới bằng cách kết hợp toán học các cột hiện tại.",
    configSchema: {
        new_column_name: {
            type: "text",
            label: "Tên cột đặc trưng mới",
            validation: { required: true },
        } satisfies BlockConfigField,
        formula: {
            type: "text",
            label: "Công thức toán học (ví dụ: col1 * col2 + col3)",
            validation: { required: true },
        } satisfies BlockConfigField,
        error_handling: {
            type: "select",
            label: "Cách xử lý lỗi tính toán (chia cho 0...)",
            default: "null",
            options: [
                { label: "Gán giá trị Null", value: "null" },
                { label: "Gán bằng 0", value: "zero" },
                { label: "Không xử lý (gây lỗi dừng pipeline)", value: "error" },
            ],
        } satisfies BlockConfigField,
    },
    portSchema: { ports: transformPorts },
}
