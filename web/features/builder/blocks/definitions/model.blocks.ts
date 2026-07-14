import type { BlockDefinition, BlockPort } from '@/lib/models';
import type { BlockConfigField } from '../socket-types';

const standardPorts: BlockPort[] = [
  { id: 'train_dataset', label: 'Train Dataset', direction: 'input', artifact: 'Dataset', required: true, multiple: false },
  { id: 'val_dataset', label: 'Validation Dataset', direction: 'input', artifact: 'Dataset', required: false, multiple: false },
  { id: 'model', label: 'Trained Model', direction: 'output', artifact: 'TrainedModel', required: true, multiple: true },
  { id: 'model_spec', label: 'Model Specification', direction: 'output', artifact: 'ModelSpec', required: true, multiple: true },
];

const deepLearningPorts: BlockPort[] = [
  { id: 'train_dataset', label: 'Train Dataset', direction: 'input', artifact: 'Dataset', required: true, multiple: false },
  { id: 'val_dataset', label: 'Validation Dataset', direction: 'input', artifact: 'Dataset', required: false, multiple: false },
  { id: 'hyperparameters', label: 'Hyperparameters', direction: 'input', artifact: 'Hyperparameters', required: false, multiple: false },
  { id: 'loss_config', label: 'Loss Config', direction: 'input', artifact: 'LossConfig', required: false, multiple: false },
  { id: 'early_stopping_config', label: 'Early Stopping Config', direction: 'input', artifact: 'EarlyStoppingConfig', required: false, multiple: false },
  { id: 'model', label: 'Trained Model', direction: 'output', artifact: 'TrainedModel', required: true, multiple: true },
  { id: 'model_spec', label: 'Model Specification', direction: 'output', artifact: 'ModelSpec', required: true, multiple: true },
];

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
      label: "Phạt Regularization",
      default: "l2",
      options: [
        { label: "L1", value: "l1" },
        { label: "L2", value: "l2" },
        { label: "ElasticNet", value: "elasticnet" },
        { label: "Không phạt", value: "none" },
      ],
    } satisfies BlockConfigField,
    C: {
      type: "number",
      label: "Hệ số C",
      default: 1.0,
      validation: { min: 0.0001 },
    } satisfies BlockConfigField,
    solver: {
      type: "select",
      label: "Thuật toán tối ưu",
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
      label: "Số vòng lặp tối đa",
      default: 100,
      validation: { min: 1 },
    } satisfies BlockConfigField,
  },
  portSchema: { ports: standardPorts },
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
      label: "Tiêu chí phân tách",
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
  },
  portSchema: { ports: standardPorts },
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
      label: "Số lượng cây quyết định",
      default: 100,
      validation: { min: 1 },
    } satisfies BlockConfigField,
    criterion: {
      type: "select",
      label: "Tiêu chí phân tách",
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
        { label: "Căn bậc 2", value: "sqrt" },
        { label: "Logarit cơ số 2", value: "log2" },
        { label: "Toàn bộ", value: "none" },
      ],
    } satisfies BlockConfigField,
  },
  portSchema: { ports: standardPorts },
}

export const SVMBlock: BlockDefinition = {
  id: "svm",
  code: "svm",
  name: "SVM",
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
      label: "Hàm nhân",
      default: "rbf",
      options: [
        { label: "Tuyến tính", value: "linear" },
        { label: "Đa thức", value: "poly" },
        { label: "RBF", value: "rbf" },
        { label: "Sigmoid", value: "sigmoid" },
      ],
    } satisfies BlockConfigField,
    degree: {
      type: "number",
      label: "Bậc của đa thức",
      default: 3,
      validation: { min: 1 },
    } satisfies BlockConfigField,
    gamma: {
      type: "select",
      label: "Hệ số Gamma",
      default: "scale",
      options: [
        { label: "Scale", value: "scale" },
        { label: "Auto", value: "auto" },
      ],
    } satisfies BlockConfigField,
  },
  portSchema: { ports: standardPorts },
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
      label: "Tính toán Bias hoặc Intercept",
      default: true,
    } satisfies BlockConfigField,
    copy_X: {
      type: "switch",
      label: "Copy thuộc tính X để tránh ghi đè",
      default: true,
    } satisfies BlockConfigField,
  },
  portSchema: { ports: standardPorts },
}

export const RidgeRegressionBlock: BlockDefinition = {
  id: "ridge_regression",
  code: "ridge_regression",
  name: "Ridge Regression",
  categoryId: "model",
  description: "Hồi quy tuyến tính bổ dung hình phạt L2 vào hàm tối ưu để chống đa cộng tuyến.",
  configSchema: {
    alpha: {
      type: "number",
      label: "Hệ số phạt Alpha",
      default: 1.0,
      validation: { min: 0 },
    } satisfies BlockConfigField,
    fit_intercept: {
      type: "switch",
      label: "Tính toán Bias hoặc Intercept",
      default: true,
    } satisfies BlockConfigField,
    solver: {
      type: "select",
      label: "Thuật toán giải bài toán tối ưu",
      default: "auto",
      options: [
        { label: "Tự động", value: "auto" },
        { label: "SVD decomposition", value: "svd" },
        { label: "Cholesky solver", value: "cholesky" },
        { label: "Lsqr", value: "lsqr" },
        { label: "Sag", value: "sag" },
        { label: "Saga", value: "saga" },
      ],
    } satisfies BlockConfigField,
  },
  portSchema: { ports: standardPorts },
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
      label: "Số lượng cụm phân chia",
      default: 8,
      validation: { required: true, min: 2 },
    } satisfies BlockConfigField,
    init: {
      type: "select",
      label: "Cách khởi tạo tâm cụm",
      default: "k-means++",
      options: [
        { label: "K-Means++", value: "k-means++" },
        { label: "Khởi tạo ngẫu nhiên", value: "random" },
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
      label: "Random State",
      default: 42,
      validation: { min: 0 },
    } satisfies BlockConfigField,
  },
  portSchema: { ports: standardPorts },
}

// ==========================================
// DEEP LEARNING
// ==========================================

export const ANNBlock: BlockDefinition = {
  id: "ann_model",
  code: "ann_model",
  name: "Mạng Nơ-ron Nhân tạo",
  categoryId: "model",
  description: "Mô hình Deep Learning cơ bản gồm các lớp Dense liên kết đầy đủ học các biểu diễn phi tuyến.",
  configSchema: {
    hidden_layers: {
      type: "textarea",
      label: "Số lượng nơ-ron tại các lớp ẩn",
      default: "64, 32",
      validation: { required: true },
    } satisfies BlockConfigField,
    activation: {
      type: "select",
      label: "Hàm kích hoạt",
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
      label: "Tốc độ học",
      default: 0.001,
      validation: { required: true, min: 0.00001 },
    } satisfies BlockConfigField,
  },
  portSchema: { ports: deepLearningPorts },
}

export const CNNBlock: BlockDefinition = {
  id: "cnn_model",
  code: "cnn_model",
  name: "Mạng Nơ-ron Tích chập",
  categoryId: "model",
  description: "Mô hình học sâu sử dụng tích chập để tự động trích xuất các đặc trưng không gian.",
  configSchema: {
    conv_layers: {
      type: "textarea",
      label: "Số filter trong các lớp Conv",
      default: "32, 64",
      validation: { required: true },
    } satisfies BlockConfigField,
    kernel_size: {
      type: "number",
      label: "Kích thước ô tích chập",
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
  },
  portSchema: { ports: deepLearningPorts },
}
