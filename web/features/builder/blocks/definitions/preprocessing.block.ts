import type { BlockDefinition } from '@/lib/models';
import type { BlockConfigField } from '../socket-types';

export const HandleMissingValues: BlockDefinition = {
    id: "handle_missing_values",
    code: "handle_missing_values",
    name: "Handle Missing Values",
    categoryId: "preprocess_data",
    description: "Xử lý các giá trị thiếu trong dataset bằng cách điền (impute) hoặc xoá bỏ.",
    configSchema: {
        strategy: {
            type: "select",
            label: "Chiến lược xử lý",
            default: "fill_mean",
            options: [
                { label: "Xoá dòng chứa giá trị thiếu", value: "drop_rows" },
                { label: "Xoá cột chứa giá trị thiếu", value: "drop_columns" },
                { label: "Điền bằng trung bình", value: "fill_mean" },
                { label: "Điền bằng trung vị", value: "fill_median" },
                { label: "Điền bằng giá trị xuất hiện nhiều nhất", value: "fill_mode" },
                { label: "Điền bằng giá trị cố định", value: "fill_constant" },
            ],
            validation: { required: true },
        } satisfies BlockConfigField,
        fill_value: {
            type: "text",
            label: "Giá trị điền cố định (chỉ dùng khi strategy = fill_constant)",
        } satisfies BlockConfigField,
        target_columns: {
            type: "textarea",
            label: "Danh sách cột áp dụng (để trống = áp dụng toàn bộ cột)",
        } satisfies BlockConfigField,
        missing_threshold: {
            type: "number",
            label: "Ngưỡng tỉ lệ thiếu để tự động drop cột trước khi xử lý (0–1)",
            default: 0.5,
            validation: { min: 0, max: 1 },
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [{
            id: 'dataset',
            type: 'dataset',
            dataType: "tabular",
            label: "Dataset đầu vào",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [{
            id: 'dataset',
            type: 'dataset',
            dataType: "tabular",
            label: "Dataset đầu ra",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
}

export const RemoveDuplicates: BlockDefinition = {
    id: "remove_duplicates",
    code: "remove_duplicates",
    name: "Remove Duplicates",
    categoryId: "preprocess_data",
    description: "Xoá các dòng dữ liệu bị trùng lặp hoàn toàn (hoặc trùng theo một số cột chỉ định).",
    configSchema: {
        subset_columns: {
            type: "textarea",
            label: "Chỉ xét trùng lặp theo các cột này (để trống = xét toàn bộ cột)",
        } satisfies BlockConfigField,
        keep: {
            type: "select",
            label: "Dòng nào được giữ lại khi phát hiện trùng lặp",
            default: "first",
            options: [
                { label: "Giữ dòng đầu tiên", value: "first" },
                { label: "Giữ dòng cuối cùng", value: "last" },
                { label: "Xoá hết tất cả các dòng trùng", value: "none" },
            ],
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [{
            id: 'dataset',
            type: 'dataset',
            dataType: "tabular",
            label: "Dataset đầu vào",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [{
            id: 'dataset',
            type: 'dataset',
            dataType: "tabular",
            label: "Dataset đầu ra",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
}

export const Encoding: BlockDefinition = {
    id: "encoding",
    code: "encoding",
    name: "Encoding",
    categoryId: "preprocess_data",
    description:
        "Mã hoá các cột dạng chữ thành số để mô hình ML có thể hiểu được.",
    configSchema: {
        method: {
            type: "select",
            label: "Phương pháp mã hoá",
            default: "label_encoding",
            options: [
                { label: "Label Encoding", value: "label_encoding" },
                { label: "One-Hot Encoding", value: "one_hot_encoding" },
            ],
            validation: { required: true },
        } satisfies BlockConfigField,
        target_columns: {
            type: "textarea",
            label: "Danh sách cột cần mã hoá",
            validation: { required: true },
        } satisfies BlockConfigField,
        handle_unknown: {
            type: "select",
            label: "Cách xử lý giá trị mới chưa từng thấy lúc train",
            default: "error",
            options: [
                { label: "Báo lỗi", value: "error" },
                { label: "Bỏ qua, gán 0", value: "ignore" },
            ],
        } satisfies BlockConfigField,
        max_categories: {
            type: "number",
            label: "Số lượng category tối đa cho phép (chỉ áp dụng One-Hot)",
            default: 20,
            validation: { min: 2 },
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [{
            id: 'dataset',
            type: 'dataset',
            dataType: "tabular",
            label: "Dataset đầu vào",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [{
            id: 'dataset',
            type: 'dataset',
            dataType: "tabular",
            label: "Dataset đầu ra",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
}

export const Normalization: BlockDefinition = {
    id: "normalization",
    code: "normalization",
    name: "Normalization",
    categoryId: "preprocess_data",
    description: "Chuẩn hoá các cột số về cùng 1 thang đo",
    configSchema: {
        method: {
            type: "select",
            label: "Phương pháp chuẩn hoá",
            default: "min_max",
            options: [
                { label: "MinMax Scaling — đưa về [min, max]", value: "min_max" },
                { label: "Z-score Standardization — mean=0, std=1", value: "z_score" },
            ],
            validation: { required: true },
        } satisfies BlockConfigField,
        target_columns: {
            type: "textarea",
            label: "Danh sách cột số cần chuẩn hoá",
            validation: { required: true },
        } satisfies BlockConfigField,
        feature_range_min: {
            type: "number",
            label: "Giá trị nhỏ nhất sau chuẩn hoá",
            default: 0,
        } satisfies BlockConfigField,
        feature_range_max: {
            type: "number",
            label: "Giá trị lớn nhất sau chuẩn hoá",
            default: 1,
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [{
            id: 'dataset',
            type: 'dataset',
            dataType: "tabular",
            label: "Dataset đầu vào",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [{
            id: 'dataset',
            type: 'dataset',
            dataType: "tabular",
            label: "Dataset đầu ra",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
}

export const ResizeCropImage: BlockDefinition = {
    id: "resize_crop_image",
    code: "resize_crop_image",
    name: "Resize/Crop ảnh",
    categoryId: "preprocess_data",
    description: "Đưa toàn bộ ảnh về cùng kích thước và/hoặc cắt bớt vùng ảnh không cần thiết.",
    configSchema: {
        operation: {
            type: "select",
            label: "Thao tác áp dụng",
            default: "resize",
            options: [
                { label: "Chỉ resize", value: "resize" },
                { label: "Chỉ crop", value: "crop" },
                { label: "Resize rồi crop", value: "resize_and_crop" },
            ],
            validation: { required: true },
        } satisfies BlockConfigField,
        target_width: {
            type: "number",
            label: "Chiều rộng đích (px)",
            default: 224,
            validation: { required: true, min: 1 },
        } satisfies BlockConfigField,
        target_height: {
            type: "number",
            label: "Chiều cao đích (px)",
            default: 224,
            validation: { required: true, min: 1 },
        } satisfies BlockConfigField,
        crop_mode: {
            type: "select",
            label: "Vị trí crop (chỉ dùng khi operation có crop)",
            default: "center",
            options: [
                { label: "Ở giữa", value: "center" },
                { label: "Ngẫu nhiên", value: "random" },
                { label: "Góc trên trái", value: "top_left" },
            ],
        } satisfies BlockConfigField,
        interpolation: {
            type: "select",
            label: "Thuật toán nội suy khi resize",
            default: "bilinear",
            options: [
                { label: "Nearest Neighbor", value: "nearest" },
                { label: "Bilinear", value: "bilinear" },
                { label: "Bicubic", value: "bicubic" },
            ],
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [{
            id: 'dataset',
            type: 'dataset',
            dataType: "tabular",
            label: "Dataset đầu vào",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [{
            id: 'dataset',
            type: 'dataset',
            dataType: "tabular",
            label: "Dataset đầu ra",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
}


export const DataAugmentation: BlockDefinition = {
    id: "data_augmentation",
    code: "data_augmentation",
    name: "Data Augmentation",
    categoryId: "preprocess_data",
    description:
        "Sinh thêm dữ liệu ảnh huấn luyện bằng cách biến đổi ảnh gốc",
    configSchema: {
        enable_rotation: { type: "switch", label: "Bật xoay ảnh ngẫu nhiên", default: false } satisfies BlockConfigField,
        rotation_range: {
            type: "number",
            label: "Góc xoay tối đa (độ, chỉ dùng khi enable_rotation = true)",
            default: 15,
            validation: { min: 0, max: 180 },
        } satisfies BlockConfigField,
        enable_flip_horizontal: { type: "switch", label: "Bật lật ngang", default: true } satisfies BlockConfigField,
        enable_flip_vertical: { type: "switch", label: "Bật lật dọc", default: false } satisfies BlockConfigField,
        enable_zoom: { type: "switch", label: "Bật phóng to/thu nhỏ ngẫu nhiên", default: false } satisfies BlockConfigField,
        zoom_range: {
            type: "number",
            label: "Biên độ zoom (ví dụ 0.1 = ±10%, chỉ dùng khi enable_zoom = true)",
            default: 0.1,
            validation: { min: 0, max: 1 },
        } satisfies BlockConfigField,
        enable_brightness: { type: "switch", label: "Bật thay đổi độ sáng ngẫu nhiên", default: false } satisfies BlockConfigField,
        brightness_range: {
            type: "number",
            label: "Biên độ thay đổi độ sáng (chỉ dùng khi enable_brightness = true)",
            default: 0.2,
            validation: { min: 0, max: 1 },
        } satisfies BlockConfigField,
        augmentation_factor: {
            type: "number",
            label: "Số ảnh biến đổi sinh thêm cho mỗi ảnh gốc",
            default: 1,
            validation: { min: 1 },
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [{
            id: 'dataset',
            type: 'dataset',
            dataType: "tabular",
            label: "Dataset đầu vào",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [{
            id: 'dataset',
            type: 'dataset',
            dataType: "tabular",
            label: "Dataset đầu ra",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
}

