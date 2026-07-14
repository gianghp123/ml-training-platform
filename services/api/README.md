# ML Training Platform - Backend API Service

Dịch vụ Backend API cho Nền tảng Huấn luyện Machine Learning (ML Training Platform), được xây dựng bằng framework **NestJS** kết hợp với **TypeScript**, sử dụng cơ sở dữ liệu **PostgreSQL** (thông qua TypeORM), lưu trữ dữ liệu lớn/sản phẩm với **MinIO** (S3-compatible) và xác thực người dùng bằng **Clerk Auth**.

---

## 🚀 Hướng dẫn khởi chạy & thiết lập dự án

### 1. Cài đặt các thư viện phụ thuộc
Đảm bảo bạn đã cài đặt NodeJS (phiên bản khuyên dùng >= 18).
```bash
$ npm install
```

### 2. Thiết lập môi trường và cơ sở dữ liệu
Sao chép cấu hình môi trường từ file mẫu và chỉnh sửa nếu cần (nằm tại `.env`):
```bash
# Sao chép và cấu hình biến môi trường
# Khởi chạy PostgreSQL và MinIO bằng Docker Compose
$ docker compose up -d
```

### 3. Biên dịch và chạy ứng dụng
```bash
# Chế độ phát triển (development)
$ npm run start

# Chế độ phát triển có nóng (watch mode)
$ npm run start:dev

# Chế độ sản phẩm (production mode)
$ npm run start:prod
```

### 4. Chạy kiểm thử (Tests)
```bash
# Chạy Unit Tests
$ npm run test

# Chạy End-to-End (E2E) Tests
$ npm run test:e2e

# Đo mức độ phủ sóng của test (coverage)
$ npm run test:cov
```

---

## 📂 Sơ đồ cấu trúc thư mục tổng quan

Dưới đây là cây thư mục chính trong dự án của chúng ta:

```text
services/api/
├── .env (cấu hình môi trường)
├── docker-compose.yaml (Postgres & MinIO local setup)
├── test/ (kiểm thử End-to-End)
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
└── src/ (mã nguồn chính)
    ├── configs/ (cấu hình các module dịch vụ)
    │   └── typeorm.config.ts
    ├── database/ (cơ sở dữ liệu - thực thể và migration)
    │   ├── entities/ (các bảng thực thể)
    │   └── migrations/ (quản lý lịch sử cơ sở dữ liệu)
    ├── libs/ (thư viện enums và các định nghĩa kiểu dùng chung)
    │   ├── enums/
    │   └── types/
    ├── modules/ (các mô-đun nghiệp vụ chính)
    │   ├── auth/ (Xác thực và phân quyền với Clerk)
    │   ├── block/ (Quản lý các khối / tác vụ trong pipeline)
    │   ├── dataset/ (Quản lý các tệp dataset huấn luyện)
    │   ├── execution/ (Theo dõi và kiểm soát các lượt thực thi pipeline/nút)
    │   ├── model-registry/ (Đăng ký và lưu trữ mô hình ML sau huấn luyện)
    │   ├── worker/ (Giám sát các nút worker tính toán phân tán)
    │   └── workflow/ (Định nghĩa thiết kế & các phiên bản luồng pipeline)
    ├── app.controller.ts
    ├── app.module.ts
    ├── app.service.ts
    └── main.ts (điểm khởi chạy ứng dụng)
```

---

## 🔍 Chi tiết vai trò của từng thư mục & tệp tin

### ⚙️ Các tệp cấu hình ở thư mục gốc (`services/api/`)

*   `.env`: Khai báo toàn bộ các biến môi trường của hệ thống (cổng kết nối, cấu hình Database, API keys của Clerk, tài khoản quản lý Swagger UI, cấu hình lưu trữ MinIO).
*   `.gitignore`: Định nghĩa các tệp/thư mục không được đẩy lên Git repository (như `node_modules`, thư mục build `dist`, và tệp chứa thông tin nhạy cảm `.env`).
*   `.prettierrc`: Thiết lập các quy tắc định dạng code (formatting rules) chung của đội ngũ phát triển.
*   `docker-compose.yaml`: Khởi chạy tự động hai dịch vụ hạ tầng chạy local: PostgreSQL (cơ sở dữ liệu chính) và MinIO (lưu trữ tệp nhị phân lớn như dataset và model weights).
*   `eslint.config.mjs`: Định nghĩa bộ quy tắc linting giúp phát hiện lỗi cú pháp và bắt buộc chuẩn hóa code TypeScript.
*   `nest-cli.json`: Tệp cấu hình cho NestJS CLI (công cụ dòng lệnh), quản lý việc biên dịch các tệp assets bổ sung.
*   `package.json`: Nơi quản lý các gói thư viện cài thêm (dependencies), thông tin dự án và các lệnh build/chạy hệ thống.
*   `package-lock.json`: Khóa cứng phiên bản chi tiết của các gói phụ thuộc NodeJS để đảm bảo chạy đồng nhất trên các môi trường.
*   `tsconfig.json`: Định nghĩa các cấu hình biên dịch mã nguồn từ TypeScript sang JavaScript.
*   `tsconfig.build.json`: Cấu hình biên dịch tối ưu hóa dành riêng cho việc đóng gói sản phẩm production (bỏ qua các file test).

---

### 🧪 Thư mục kiểm thử E2E (`services/api/test/`)

Thư mục chứa các tệp kiểm thử tích hợp, giả lập các hành vi của Client gọi vào hệ thống:
*   `test/app.e2e-spec.ts`: Code kịch bản test tích hợp End-to-End cho Controller gốc.
*   `test/jest-e2e.json`: Cấu hình chạy thử nghiệm E2E dành cho Jest framework.

---

### 📂 Thư mục mã nguồn chính (`services/api/src/`)

#### 📌 Các file cốt lõi ở cấp độ root của `src/`
*   `src/main.ts`: Điểm khởi chạy (Entrypoint) chính của dịch vụ Backend. Thiết lập các cấu hình global:
    *   Tích hợp middleware bảo mật `helmet`.
    *   Giới hạn dung lượng nhận API dạng JSON/Urlencoded lên tới `100mb` (hỗ trợ đẩy file/data lớn).
    *   Version hóa API theo URI (mặc định tiền tố `/v1`).
    *   Đăng ký Middleware xác thực tài khoản `clerkMiddleware`.
    *   Bật giao diện Swagger UI ở địa chỉ `/api` ở môi trường dev để tự động sinh tài liệu tài liệu tương tác API.
*   `src/app.module.ts`: Module điều hướng trung tâm. Thực hiện cấu hình nạp biến môi trường toàn cục, khởi tạo cổng kết nối database bằng TypeORM, kết nối các Module nghiệp vụ khác và tiêm (inject) hai Guard toàn cục: `ClerkAuthGuard` (bảo vệ tài nguyên yêu cầu đăng nhập) và `RolesGuard` (phân quyền vai trò).
*   `src/app.controller.ts`: Controller cơ bản dùng làm endpoint kiểm tra trạng thái sống/chết (Health-check) của API.
*   `src/app.controller.spec.ts`: File viết kịch bản Unit test cho `AppController`.
*   `src/app.service.ts`: Cung cấp logic phản hồi đơn giản (chữ "Hello World!") cho Controller gốc.

---

#### 🛠️ Thư mục cấu hình (`services/api/src/configs/`)
*   `src/configs/typeorm.config.ts`: Thiết lập các thông số cơ sở dữ liệu PostgreSQL cho TypeORM. Sử dụng thư viện `SnakeNamingStrategy` để tự động ánh xạ các thuộc tính camelCase trong code sang các cột database dạng snake_case.

---

#### 🗄️ Thư mục Cơ sở dữ liệu (`services/api/src/database/`)

##### 🧬 Thực thể cơ sở dữ liệu (`entities/`)
Các file biểu diễn cấu trúc bảng và mối quan hệ trong DB:
*   `artifact.entity.ts`: Thực thể `Artifact` - lưu trữ thông tin sản phẩm đầu ra sinh ra trong quá trình chạy một node (ví dụ: file log, model checkpoint, tệp tin csv kết quả). Có quan hệ kết nối đến `WorkflowRun`, `NodeExecution`, và `ModelRegistry`.
*   `block-category.entity.ts`: Thực thể `BlockCategory` - phân nhóm các khối xử lý (ví dụ: nhóm nạp dữ liệu, nhóm biến đổi dữ liệu, nhóm mô hình học máy).
*   `block-definition.entity.ts`: Thực thể `BlockDefinition` - đặc tả cấu trúc của một block (nhận input gì, sinh output gì, các tham số có thể cấu hình được để lập trình viên kéo thả trên frontend).
*   `dataset.entity.ts`: Thực thể `Dataset` - quản lý các nguồn dữ liệu đầu vào được đăng tải, bao gồm đường dẫn lưu trữ, kích thước, định dạng tệp.
*   `model-registry.entity.ts`: Thực thể `ModelRegistry` - lưu trữ danh sách các mô hình ML đã đăng ký lưu hành, trỏ trực tiếp đến artifact chứa weights của mô hình đó.
*   `node-execution.entity.ts`: Thực thể `NodeExecution` - quản lý tiến trình chạy riêng lẻ của từng node/tác vụ cụ thể trong một lượt chạy pipeline, ghi nhận worker nào đang chạy, thời gian chạy và số lần chạy lại nếu gặp lỗi.
*   `worker.entity.ts`: Thực thể `Worker` - quản lý các node máy chủ tính toán kết nối vào hệ thống để nhận tác vụ huấn luyện về chạy.
*   `workflow.entity.ts`: Thực thể `Workflow` - quản lý các Pipeline luồng xử lý do người dùng thiết kế.
*   `workflow-version.entity.ts`: Thực thể `WorkflowVersion` - quản lý sơ đồ liên kết dạng đồ thị có hướng không chu trình (DAG) của luồng theo từng phiên bản chỉnh sửa khác nhau.
*   `workflow-run.entity.ts`: Thực thể `WorkflowRun` - lưu trữ lịch sử một lượt chạy thực tế của một phiên bản workflow (kết hợp với dataset cụ thể, trạng thái chung của lượt chạy).

##### 🚀 Lịch sử thay đổi cơ sở dữ liệu (`migrations/`)
Danh sách các file migration tạo bảng, khóa ngoại và dữ liệu ban đầu cho cơ sở dữ liệu:
*   `1782971373098-CreateBlockCategories.ts`: Tạo bảng phân nhóm khối xử lý.
*   `1782971373099-CreateBlockDefinitions.ts`: Tạo bảng đặc tả thông số kỹ thuật của các khối xử lý.
*   `1782971373100-CreateWorkflows.ts`: Tạo bảng lưu trữ pipelines.
*   `1782971373101-CreateWorkflowVersions.ts`: Tạo bảng lưu trữ phiên bản thiết kế DAG.
*   `1782971373102-CreateDatasets.ts`: Tạo bảng thông tin datasets.
*   `1782971373103-CreateWorkers.ts`: Tạo bảng đăng ký worker nodes.
*   `1782971373104-CreateWorkflowRuns.ts`: Tạo bảng theo dõi các lượt thực thi pipeline.
*   `1782971373105-CreateNodeExecutions.ts`: Tạo bảng theo dõi tiến trình của từng nút chạy.
*   `1782971373106-CreateArtifacts.ts`: Tạo bảng lưu trữ kết quả tệp tin sinh ra.
*   `1782971373107-CreateModelRegistries.ts`: Tạo bảng lưu trữ thông tin các mô hình học máy được đăng ký.

---

#### 📦 Thư viện dùng chung (`services/api/src/libs/`)

##### 🏷️ Enums dùng chung (`libs/enums/`)
Nơi định nghĩa các giá trị không đổi cho trạng thái của hệ thống:
*   `artifact-type.enum.ts`: Định nghĩa các loại tệp đầu ra (`MODEL`, `DATASET`, `LOG`, `METRIC`, `OTHER`).
*   `dataset-format.enum.ts`: Các định dạng tệp dữ liệu được hỗ trợ (`CSV`, `JSON`, `ZIP`, `PARQUET`, v.v.).
*   `node-execution-status.enum.ts`: Trạng thái chạy của nút (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `SKIPPED`).
*   `user-role.enum.ts`: Định nghĩa các vai trò truy cập ứng dụng (`USER`, `ADMIN`).
*   `worker-status.enum.ts`: Trạng thái sức khỏe máy worker (`ACTIVE`, `INACTIVE`, `BUSY`).
*   `workflow-run-status.enum.ts`: Trạng thái lượt chạy pipeline tổng quát (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`).
*   `index.ts`: Tệp gom nhóm giúp việc import các enums trên ngắn gọn và dễ dàng hơn.

##### 📐 Các định nghĩa kiểu bổ sung (`libs/types/`)
*   `globals.d.ts`: Định nghĩa các kiểu mở rộng toàn cục hoặc khai báo đè (ví dụ: mở rộng kiểu Request của Express để chứa thông tin người dùng được giải mã từ token).

---

#### 🧩 Các Module Nghiệp vụ Hệ thống (`services/api/src/modules/`)

Mỗi mô-đun được tách biệt rõ ràng để quản lý các khía cạnh nghiệp vụ cụ thể. Cấu trúc chung của một mô-đun bao gồm:
*   `[tên-module].module.ts`: Khai báo module kết nối Controllers, Services và Entities liên quan.
*   `controllers/`: Các Endpoint nhận yêu cầu HTTP từ Client, chịu trách nhiệm parse request và gọi Service.
*   `services/`: Chứa mã nguồn thực hiện tính toán, kiểm tra nghiệp vụ và làm việc trực tiếp với các Repository của Database.
*   `dtos/`: (Data Transfer Object) - Quản lý cấu trúc kiểm tra tính hợp lệ dữ liệu đầu vào bằng `class-validator` và mô tả kiểu dữ liệu đầu ra.

##### 🔒 1. Module Xác thực & Phân quyền (`modules/auth/`)
Không có Module riêng mà hoạt động như thư viện cốt lõi tiêm bảo mật cho toàn hệ thống:
*   `decorators/`:
    *   `current-user.decorator.ts`: Decorator tùy chỉnh giúp lấy nhanh thông tin người dùng hiện tại từ Request.
    *   `public.decorator.ts`: Decorator đánh dấu Endpoint là công khai (không cần xác thực token).
    *   `role.decorator.ts`: Ràng buộc danh sách các vai trò (User/Admin) được quyền truy cập API.
*   `guards/`:
    *   `clerk-auth.guard.ts`: Bộ lọc chặn request, kiểm tra phiên đăng nhập Clerk để đảm bảo Token còn hạn.
    *   `role.guard.ts`: Bộ lọc so khớp vai trò của người dùng (trong JWT Claims) với vai trò yêu cầu của endpoint.
*   `interfaces/`:
    *   `current-user.interface.ts`: Định dạng cấu trúc dữ liệu người dùng được gán vào luồng xử lý sau khi xác thực thành công.

##### 📦 2. Module Quản lý Khối tác vụ (`modules/block/`)
Module cung cấp thông tin về các khối xử lý dùng cho việc xây dựng đồ thị luồng (DAG):
*   `block.module.ts`: Gom cụm Controller và Service cho Block.
*   `controllers/`:
    *   `block-category.controller.ts`: API cho người dùng xem danh mục các nhóm khối.
    *   `block-definition.controller.ts`: API cho người dùng xem các khối chức năng có sẵn.
    *   `admin/block-category.admin.controller.ts`: API cho quản trị viên tạo, sửa, xóa danh mục.
    *   `admin/block-definition.admin.controller.ts`: API cho quản trị viên thêm mới cấu hình khối tác vụ hoặc cập nhật chúng.
*   `services/`:
    *   `block-category.service.ts`: Nghiệp vụ quản lý danh mục.
    *   `block-definition.service.ts`: Nghiệp vụ xử lý định nghĩa chi tiết của khối.

##### 📊 3. Module Dataset Dữ liệu huấn luyện (`modules/dataset/`)
Module giúp người dùng tải lên, kiểm tra thông tin và xóa tập dữ liệu dùng cho huấn luyện:
*   `dataset.module.ts`: Khai báo Module Dataset.
*   `controllers/dataset.controller.ts`: Cung cấp API tải lên dataset, truy vấn danh sách, hoặc lấy chi tiết metadata của dataset.
*   `services/dataset.service.ts`: Xử lý logic tải tệp lên storage MinIO, tạo bản ghi trong PostgreSQL, và tính toán đường dẫn tải xuống.

##### ⚡ 4. Module Thực thi Pipeline (`modules/execution/`)
Mô-đun phức tạp nhất, điều phối toàn bộ quá trình chạy đồ thị huấn luyện:
*   `execution.module.ts`: Khai báo Module Thực thi.
*   `controllers/`:
    *   `workflow-run.controller.ts`: API khởi chạy một pipeline (`start`), hủy lượt chạy (`cancel`) hoặc xem lịch sử tất cả các lượt chạy.
    *   `node-execution.controller.ts`: API truy vấn trạng thái thực thi cụ thể của một nút trong đồ thị đang chạy, ghi log tiến trình.
    *   `artifact.controller.ts`: API lấy thông tin chi tiết hoặc tải về tệp sản phẩm được sản sinh bởi các node.
*   `services/`:
    *   `workflow-run.service.ts`: Điều phối tổng thể lượt chạy, lập lịch chạy các node theo đúng sơ đồ luồng DAG, cập nhật trạng thái chung.
    *   `node-execution.service.ts`: Chịu trách nhiệm giao nhiệm vụ chạy nút cho worker, giám sát thời gian chạy và cập nhật trạng thái kết quả của nút.
    *   `artifact.service.ts`: Thực hiện đăng ký các tệp đầu ra mới sinh vào DB và sinh đường dẫn tải tài nguyên từ Storage.

##### 🏷️ 5. Module Đăng ký Mô hình (`modules/model-registry/`)
Module quản lý các Model được đóng gói để tái sử dụng hoặc phục vụ (serving):
*   `model-registry.module.ts`: Khai báo Module Đăng ký Mô hình.
*   `controllers/model-registry.controller.ts`: API đăng ký mô hình từ một artifact đã có, liệt kê danh sách mô hình học máy.
*   `services/model-registry.service.ts`: Xử lý kiểm tra tính hợp lệ của model artifact và lưu trữ thông tin đăng ký vào database.

##### 👷 6. Module Giám sát Máy Worker (`modules/worker/`)
Module dành riêng cho quản trị để giám sát các tài nguyên máy chủ tính toán phân tán:
*   `worker.module.ts`: Khai báo Module Worker.
*   `controllers/admin/worker.admin.controller.ts`: API đăng ký worker mới, giám sát các máy đang kết nối trong cụm tính toán.
*   `services/worker.service.ts`: Nhận tín hiệu nhịp tim (heartbeat) định kỳ từ các worker bên ngoài để duy trì trạng thái "Active" của worker, hủy phân bổ worker nếu bị ngắt kết nối quá lâu.

##### 🗺️ 7. Module Thiết kế luồng Workflow (`modules/workflow/`)
Module cho phép người dùng xây dựng, chỉnh sửa và quản lý các luồng công việc (pipeline):
*   `workflow.module.ts`: Khai báo Module Workflow.
*   `controllers/`:
    *   `workflow.controller.ts`: API CRUD thông tin mô tả cơ bản của Workflow (tên, mô tả, chủ sở hữu).
    *   `workflow-version.controller.ts`: API lưu thiết kế đồ thị DAG mới (tạo phiên bản mới) hoặc tải về một sơ đồ DAG cũ.
*   `services/`:
    *   `workflow.service.ts`: Quản lý dữ liệu chung của workflow.
    *   `workflow-version.service.ts`: Xác thực tính hợp lệ của đồ thị DAG gửi lên (ví dụ: kiểm tra chu trình, kiểm tra tính đầy đủ đầu vào/đầu ra của các node theo block definition) và lưu trữ phiên bản.

