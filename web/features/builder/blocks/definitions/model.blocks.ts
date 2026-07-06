import type { BlockDefinition } from '@/lib/models';
import type { BlockConfigField } from '../socket-types';

const commonInputSchema = {
  entries: [
    { id: 'train_dataset', type: 'dataset', label: 'Train Dataset' },
    { id: 'val_dataset', type: 'dataset', label: 'Validation Dataset', optional: true },
    { id: 'config', type: 'config', label: 'Optional Config', optional: true },
  ],
} as Record<string, unknown>;

const commonOutputSchema = {
  entries: [
    { id: 'model', type: 'model', label: 'Trained Model' },
  ],
} as Record<string, unknown>;

// ==========================================
// CLASSIFICATION
// ==========================================

export const LogisticRegressionBlock: BlockDefinition = {
  id: "logistic_regression",
  code: "logistic_regression",
  name: "Logistic Regression",
  categoryId: "model",
  description: "Mô hình phân loại tuyến tính dùng hàm sigmoid để dự báo xác suất các lớp.",
  configSchema: {
    penalty: {
      type: "select",
      label: "Phạt Regularization (Penalty)",
      default: "l2",
      options: [
        { label: "L1 (Lasso)", value: "l1" },
        { label: "L2 (Ridge)", value: "l2" },
        { label: "ElasticNet", value: "elasticnet" },
        { label: "Không phạt (None)", value: "none" },
      ],
    } satisfies BlockConfigField,
    C: {
      type: "number",
      label: "Hệ số C (Nghịch đảo độ mạnh Regularization)",
      default: 1.0,
      validation: { min: 0.0001 },
    } satisfies BlockConfigField,
    solver: {
      type: "select",
      label: "Thuật toán tối ưu (Solver)",
      default: "lbfgs",
      options: [
        { label: "Lbfgs", value: "lbfgs" },
        { label: "Liblinear", value: "liblinear" },
        { label: "Sag", value: "sag" },
        { label: "Saga", value: "saga" },
      ],
    } satisfies BlockConfigField,
    max_iter: {
      type: "number",
      label: "Số vòng lặp tối đa (Max Iterations)",
      default: 100,
      validation: { min: 1 },
    } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: commonInputSchema,
  outputSchema: commonOutputSchema,
}

export const DecisionTreeBlock: BlockDefinition = {
  id: "decision_tree",
  code: "decision_tree",
  name: "Decision Tree",
  categoryId: "model",
  description: "Mô hình cây quyết định học các quy tắc phân rẽ đặc trưng để phân loại hoặc hồi quy.",
  configSchema: {
    criterion: {
      type: "select",
      label: "Tiêu chí phân tách (Criterion)",
      default: "gini",
      options: [
        { label: "Gini Impurity", value: "gini" },
        { label: "Entropy", value: "entropy" },
        { label: "Log Loss", value: "log_loss" },
      ],
    } satisfies BlockConfigField,
    max_depth: {
      type: "number",
      label: "Chiều sâu tối đa của cây",
      default: 10,
      validation: { min: 1 },
    } satisfies BlockConfigField,
    min_samples_split: {
      type: "number",
      label: "Số mẫu tối thiểu để phân tách một nút",
      default: 2,
      validation: { min: 2 },
    } satisfies BlockConfigField,
    min_samples_leaf: {
      type: "number",
      label: "Số mẫu tối thiểu tại một nút lá",
      default: 1,
      validation: { min: 1 },
    } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: commonInputSchema,
  outputSchema: commonOutputSchema,
}

export const RandomForestBlock: BlockDefinition = {
  id: "random_forest",
  code: "random_forest",
  name: "Random Forest",
  categoryId: "model",
  description: "Mô hình Ensemble kết hợp nhiều cây quyết định để tăng độ chính xác và kháng overfitting.",
  configSchema: {
    n_estimators: {
      type: "number",
      label: "Số lượng cây quyết định (Estimators)",
      default: 100,
      validation: { min: 1 },
    } satisfies BlockConfigField,
    criterion: {
      type: "select",
      label: "Tiêu chí phân tách (Criterion)",
      default: "gini",
      options: [
        { label: "Gini Impurity", value: "gini" },
        { label: "Entropy", value: "entropy" },
        { label: "Log Loss", value: "log_loss" },
      ],
    } satisfies BlockConfigField,
    max_depth: {
      type: "number",
      label: "Chiều sâu tối đa của cây",
      default: 15,
      validation: { min: 1 },
    } satisfies BlockConfigField,
    max_features: {
      type: "select",
      label: "Số lượng đặc trưng tối đa khi rẽ nhánh",
      default: "sqrt",
      options: [
        { label: "Căn bậc 2 (Sqrt)", value: "sqrt" },
        { label: "Logarit cơ số 2 (Log2)", value: "log2" },
        { label: "Toàn bộ (None)", value: "none" },
      ],
    } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: commonInputSchema,
  outputSchema: commonOutputSchema,
}

export const SVMBlock: BlockDefinition = {
  id: "svm",
  code: "svm",
  name: "SVM (Support Vector Machine)",
  categoryId: "model",
  description: "Mô hình tìm kiếm siêu phẳng tối ưu để phân tách dữ liệu trong không gian nhiều chiều.",
  configSchema: {
    C: {
      type: "number",
      label: "Hệ số phạt lỗi C",
      default: 1.0,
      validation: { min: 0.0001 },
    } satisfies BlockConfigField,
    kernel: {
      type: "select",
      label: "Hàm nhân (Kernel)",
      default: "rbf",
      options: [
        { label: "Tuyến tính (Linear)", value: "linear" },
        { label: "Đa thức (Poly)", value: "poly" },
        { label: "RBF (Radial Basis Function)", value: "rbf" },
        { label: "Sigmoid", value: "sigmoid" },
      ],
    } satisfies BlockConfigField,
    degree: {
      type: "number",
      label: "Bậc của đa thức (chỉ dùng cho Poly)",
      default: 3,
      validation: { min: 1 },
    } satisfies BlockConfigField,
    gamma: {
      type: "select",
      label: "Hệ số Gamma (Cho RBF, Poly, Sigmoid)",
      default: "scale",
      options: [
        { label: "Scale", value: "scale" },
        { label: "Auto", value: "auto" },
      ],
    } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: commonInputSchema,
  outputSchema: commonOutputSchema,
}

// ==========================================
// REGRESSION
// ==========================================

export const LinearRegressionBlock: BlockDefinition = {
  id: "linear_regression",
  code: "linear_regression",
  name: "Linear Regression",
  categoryId: "model",
  description: "Mô hình tìm kiếm mối quan hệ tuyến tính giữa các biến độc lập và biến mục tiêu liên tục.",
  configSchema: {
    fit_intercept: {
      type: "switch",
      label: "Tính toán Bias/Intercept hệ số tự do",
      default: true,
    } satisfies BlockConfigField,
    copy_X: {
      type: "switch",
      label: "Copy thuộc tính X để tránh ghi đè",
      default: true,
    } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: commonInputSchema,
  outputSchema: commonOutputSchema,
}

export const RidgeRegressionBlock: BlockDefinition = {
  id: "ridge_regression",
  code: "ridge_regression",
  name: "Ridge Regression",
  categoryId: "model",
  description: "Hồi quy tuyến tính bổ sung hình phạt L2 vào hàm tối ưu để chống đa cộng tuyến.",
  configSchema: {
    alpha: {
      type: "number",
      label: "Hệ số phạt Alpha (Lực lượng phạt L2)",
      default: 1.0,
      validation: { min: 0 },
    } satisfies BlockConfigField,
    fit_intercept: {
      type: "switch",
      label: "Tính toán Bias/Intercept hệ số tự do",
      default: true,
    } satisfies BlockConfigField,
    solver: {
      type: "select",
      label: "Thuật toán giải bài toán tối ưu",
      default: "auto",
      options: [
        { label: "Tự động (Auto)", value: "auto" },
        { label: "SVD decomposition", value: "svd" },
        { label: "Cholesky solver", value: "cholesky" },
        { label: "Lsqr", value: "lsqr" },
        { label: "Sag (Stochastic Average Gradient)", value: "sag" },
        { label: "Saga", value: "saga" },
      ],
    } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: commonInputSchema,
  outputSchema: commonOutputSchema,
}

// ==========================================
// CLUSTERING
// ==========================================

export const KMeansBlock: BlockDefinition = {
  id: "k_means",
  code: "k_means",
  name: "K-Means Clustering",
  categoryId: "model",
  description: "Thuật toán phân cụm không giám sát chia các quan sát thành K cụm dựa trên khoảng cách Euclid.",
  configSchema: {
    n_clusters: {
      type: "number",
      label: "Số lượng cụm phân chia (K)",
      default: 8,
      validation: { required: true, min: 2 },
    } satisfies BlockConfigField,
    init: {
      type: "select",
      label: "Cách khởi tạo tâm cụm",
      default: "k-means++",
      options: [
        { label: "K-Means++ (Khuyên dùng)", value: "k-means++" },
        { label: "Khởi tạo ngẫu nhiên (Random)", value: "random" },
      ],
    } satisfies BlockConfigField,
    max_iter: {
      type: "number",
      label: "Số vòng lặp tối đa",
      default: 300,
      validation: { min: 1 },
    } satisfies BlockConfigField,
    random_state: {
      type: "number",
      label: "Random State (Seed)",
      default: 42,
      validation: { min: 0 },
    } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: commonInputSchema,
  outputSchema: commonOutputSchema,
}

// ==========================================
// DEEP LEARNING
// ==========================================

export const ANNBlock: BlockDefinition = {
  id: "ann_model",
  code: "ann_model",
  name: "Mạng Nơ-ron Nhân tạo (ANN)",
  categoryId: "model",
  description: "Mô hình Deep Learning cơ bản gồm các lớp Dense liên kết đầy đủ (Fully Connected) học các biểu diễn phi tuyến.",
  configSchema: {
    hidden_layers: {
      type: "textarea",
      label: "Số lượng nơ-ron tại các lớp ẩn (ví dụ: 64, 32)",
      default: "64, 32",
      validation: { required: true },
    } satisfies BlockConfigField,
    activation: {
      type: "select",
      label: "Hàm kích hoạt (Activation)",
      default: "relu",
      options: [
        { label: "ReLU", value: "relu" },
        { label: "Tanh", value: "tanh" },
        { label: "Sigmoid", value: "sigmoid" },
        { label: "GeLU", value: "gelu" },
      ],
    } satisfies BlockConfigField,
    dropout_rate: {
      type: "number",
      label: "Tỉ lệ Dropout chống Overfitting",
      default: 0.0,
      validation: { min: 0.0, max: 0.9, step: 0.05 },
    } satisfies BlockConfigField,
    learning_rate: {
      type: "number",
      label: "Tốc độ học (Learning Rate)",
      default: 0.001,
      validation: { required: true, min: 0.00001 },
    } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: commonInputSchema,
  outputSchema: commonOutputSchema,
}

export const CNNBlock: BlockDefinition = {
  id: "cnn_model",
  code: "cnn_model",
  name: "Mạng Nơ-ron Tích chập (CNN)",
  categoryId: "model",
  description: "Mô hình học sâu sử dụng tích chập để tự động trích xuất các đặc trưng không gian (Computer Vision).",
  configSchema: {
    conv_layers: {
      type: "textarea",
      label: "Số filter trong các lớp Conv (ví dụ: 32, 64)",
      default: "32, 64",
      validation: { required: true },
    } satisfies BlockConfigField,
    kernel_size: {
      type: "number",
      label: "Kích thước ô tích chập (Kernel Size)",
      default: 3,
      validation: { required: true, min: 1 },
    } satisfies BlockConfigField,
    pool_size: {
      type: "number",
      label: "Kích thước Pooling để giảm số chiều",
      default: 2,
      validation: { required: true, min: 1 },
    } satisfies BlockConfigField,
    dense_units: {
      type: "number",
      label: "Số nơ-ron lớp ẩn Dense đầy đủ",
      default: 128,
      validation: { required: true, min: 1 },
    } satisfies BlockConfigField,
    dropout_rate: {
      type: "number",
      label: "Tỉ lệ Dropout",
      default: 0.25,
      validation: { min: 0.0, max: 0.9 },
    } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: commonInputSchema,
  outputSchema: commonOutputSchema,
}
