import type { BlockDefinition } from '@/lib/models';
import type { BlockConfigField } from '../socket-types';

export const HandleMissingValues: BlockDefinition = {
    id: "handle_missing_values",
    code: "handle_missing_values",
    name: "Handle Missing Values",
    categoryId: "preprocess_data",
    description: "Xử lý các giá trị thiếu trong dataset bằng cách điền hoặc xoá bỏ.",
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
            label: "Giá trị điền cố định",
        } satisfies BlockConfigField,
        target_columns: {
            type: "textarea",
            label: "Danh sách cột áp dụng",
        } satisfies BlockConfigField,
        missing_threshold: {
            type: "number",
            label: "Ngưỡng tỉ lệ thiếu để tự động drop cột",
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
    description: "Xoá các dòng dữ liệu bị trùng lặp hoàn toàn.",
    configSchema: {
        subset_columns: {
            type: "textarea",
            label: "Chỉ xét trùng lặp theo các cột này",
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
            label: "Số lượng category tối đa cho phép",
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
                { label: "MinMax Scaling", value: "min_max" },
                { label: "Z-score Standardization", value: "z_score" },
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

export const DataTypeConversion: BlockDefinition = {
    id: "data_type_conversion",
    code: "data_type_conversion",
    name: "Data Type Conversion",
    categoryId: "preprocess_data",
    description: "Chuyển đổi kiểu dữ liệu của một hoặc nhiều cột.",
    configSchema: {
        target_columns: {
            type: "textarea",
            label: "Danh sách cột cần chuyển đổi",
            validation: { required: true },
        } satisfies BlockConfigField,
        target_type: {
            type: "select",
            label: "Kiểu dữ liệu đích",
            default: "string",
            options: [
                { label: "Số nguyên", value: "integer" },
                { label: "Số thực", value: "float" },
                { label: "Chuỗi", value: "string" },
                { label: "Boolean", value: "boolean" },
                { label: "Ngày giờ", value: "datetime" },
                { label: "Category", value: "category" },
            ],
            validation: { required: true },
        } satisfies BlockConfigField,
        invalid_value_handling: {
            type: "select",
            label: "Xử lý giá trị không thể chuyển đổi",
            default: "raise",
            options: [
                { label: "Báo lỗi", value: "raise" },
                { label: "Chuyển thành giá trị thiếu", value: "coerce" },
                { label: "Giữ nguyên giá trị", value: "ignore" },
            ],
        } satisfies BlockConfigField,
        datetime_format: {
            type: "text",
            label: "Định dạng ngày giờ (nếu có)",
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [{
            id: 'dataset', type: 'dataset', dataType: "tabular", label: "Dataset đầu vào",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [{
            id: 'dataset', type: 'dataset', dataType: "tabular", label: "Dataset đầu ra",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
}

export const RenameColumns: BlockDefinition = {
    id: "rename_columns",
    code: "rename_columns",
    name: "Rename Columns",
    categoryId: "preprocess_data",
    description: "Đổi tên một hoặc nhiều cột trong dataset.",
    configSchema: {
        rename_mapping: {
            type: "textarea",
            label: "Ánh xạ tên cột (tên_cũ:tên_mới, mỗi dòng một cặp)",
            validation: { required: true },
        } satisfies BlockConfigField,
        trim_names: {
            type: "switch",
            label: "Xoá khoảng trắng thừa trong tên cột",
            default: true,
        } satisfies BlockConfigField,
        duplicate_handling: {
            type: "select",
            label: "Xử lý khi tên mới đã tồn tại",
            default: "error",
            options: [
                { label: "Báo lỗi", value: "error" },
                { label: "Ghi đè", value: "overwrite" },
            ],
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [{
            id: 'dataset', type: 'dataset', dataType: "tabular", label: "Dataset đầu vào",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [{
            id: 'dataset', type: 'dataset', dataType: "tabular", label: "Dataset đầu ra",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
}

export const DropColumns: BlockDefinition = {
    id: "drop_columns",
    code: "drop_columns",
    name: "Drop Columns",
    categoryId: "preprocess_data",
    description: "Loại bỏ các cột không cần thiết khỏi dataset.",
    configSchema: {
        target_columns: {
            type: "textarea",
            label: "Danh sách cột cần xoá",
            validation: { required: true },
        } satisfies BlockConfigField,
        ignore_missing_columns: {
            type: "switch",
            label: "Bỏ qua cột không tồn tại",
            default: false,
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [{
            id: 'dataset', type: 'dataset', dataType: "tabular", label: "Dataset đầu vào",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [{
            id: 'dataset', type: 'dataset', dataType: "tabular", label: "Dataset đầu ra",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
}

export const OutlierHandling: BlockDefinition = {
    id: "outlier_handling",
    code: "outlier_handling",
    name: "Outlier Handling",
    categoryId: "preprocess_data",
    description: "Phát hiện và xử lý các giá trị ngoại lệ trong những cột số.",
    configSchema: {
        target_columns: {
            type: "textarea",
            label: "Danh sách cột số cần xử lý",
            validation: { required: true },
        } satisfies BlockConfigField,
        detection_method: {
            type: "select",
            label: "Phương pháp phát hiện",
            default: "iqr",
            options: [
                { label: "IQR", value: "iqr" },
                { label: "Z-score", value: "z_score" },
                { label: "Percentile", value: "percentile" },
            ],
            validation: { required: true },
        } satisfies BlockConfigField,
        action: {
            type: "select",
            label: "Cách xử lý ngoại lệ",
            default: "cap",
            options: [
                { label: "Xoá dòng", value: "remove" },
                { label: "Giới hạn về ngưỡng", value: "cap" },
                { label: "Thay bằng trung vị", value: "replace_median" },
                { label: "Thay bằng trung bình", value: "replace_mean" },
            ],
            validation: { required: true },
        } satisfies BlockConfigField,
        threshold: {
            type: "number",
            label: "Ngưỡng phát hiện (IQR multiplier hoặc Z-score)",
            default: 1.5,
            validation: { min: 0 },
        } satisfies BlockConfigField,
        lower_percentile: {
            type: "number",
            label: "Phân vị dưới",
            default: 0.01,
            validation: { min: 0, max: 1 },
        } satisfies BlockConfigField,
        upper_percentile: {
            type: "number",
            label: "Phân vị trên",
            default: 0.99,
            validation: { min: 0, max: 1 },
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [{
            id: 'dataset', type: 'dataset', dataType: "tabular", label: "Dataset đầu vào",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [{
            id: 'dataset', type: 'dataset', dataType: "tabular", label: "Dataset đầu ra",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
}

export const TextCleaning: BlockDefinition = {
    id: "text_cleaning",
    code: "text_cleaning",
    name: "Text Cleaning",
    categoryId: "preprocess_data",
    description: "Làm sạch và chuẩn hoá dữ liệu văn bản trước khi huấn luyện.",
    configSchema: {
        target_columns: {
            type: "textarea",
            label: "Danh sách cột văn bản cần làm sạch",
            validation: { required: true },
        } satisfies BlockConfigField,
        lowercase: {
            type: "switch", label: "Chuyển thành chữ thường", default: true,
        } satisfies BlockConfigField,
        trim_whitespace: {
            type: "switch", label: "Xoá khoảng trắng ở đầu và cuối", default: true,
        } satisfies BlockConfigField,
        normalize_whitespace: {
            type: "switch", label: "Chuẩn hoá khoảng trắng liên tiếp", default: true,
        } satisfies BlockConfigField,
        remove_punctuation: {
            type: "switch", label: "Xoá dấu câu", default: false,
        } satisfies BlockConfigField,
        remove_numbers: {
            type: "switch", label: "Xoá chữ số", default: false,
        } satisfies BlockConfigField,
        remove_special_characters: {
            type: "switch", label: "Xoá ký tự đặc biệt", default: false,
        } satisfies BlockConfigField,
        remove_stopwords: {
            type: "switch", label: "Xoá stop words", default: false,
        } satisfies BlockConfigField,
        language: {
            type: "select",
            label: "Ngôn ngữ dùng cho stop words",
            default: "vietnamese",
            options: [
                { label: "Tiếng Việt", value: "vietnamese" },
                { label: "Tiếng Anh", value: "english" },
            ],
        } satisfies BlockConfigField,
    } as Record<string, unknown>,
    inputSchema: {
        entries: [{
            id: 'dataset', type: 'dataset', dataType: "tabular", label: "Dataset đầu vào",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
    outputSchema: {
        entries: [{
            id: 'dataset', type: 'dataset', dataType: "tabular", label: "Dataset đầu ra",
            schema: { columns: "array<{name, dtype}>", num_rows: "number", num_columns: "number" }
        }],
    } as Record<string, unknown>,
}

