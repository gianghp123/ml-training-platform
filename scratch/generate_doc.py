import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def create_element(name):
    return OxmlElement(name)

def set_cell_background(cell, fill_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_code_block(doc, code_text):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "F4F6F8")
    
    # Set thin border for code block
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/>
            <w:left w:val="single" w:sz="12" w:space="0" w:color="1B365D"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    
    lines = code_text.strip().split('\n')
    for idx, line in enumerate(lines):
        if idx > 0:
            p = cell.add_paragraph()
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
        run = p.add_run(line)
        run.font.name = 'Consolas'
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(0x24, 0x29, 0x2E)
    
    # Add empty paragraph after table for spacing
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(0)
    p_after.paragraph_format.space_after = Pt(6)

def build_document():
    doc = Document()
    
    # Page setup - Margins
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Styles setup
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Arial'
    style_normal.font.size = Pt(10.5)
    style_normal.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

    # Document Header Title
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_p.paragraph_format.space_before = Pt(12)
    title_p.paragraph_format.space_after = Pt(4)
    title_run = title_p.add_run("BÁO CÁO NGHIÊN CỨU KIẾN TRÚC & THIẾT KẾ ENGINE CHẠY PYTHON TỪ DAG GRAPH JSON")
    title_run.font.size = Pt(18)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D) # Navy

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_p.paragraph_format.space_after = Pt(24)
    sub_run = sub_p.add_run("Hệ Thống Huấn Luyện Machine Learning Tự Động (ML Pipeline Platform)")
    sub_run.font.size = Pt(12)
    sub_run.font.italic = True
    sub_run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

    # Add Divider
    p_div = doc.add_paragraph()
    p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_div.paragraph_format.space_after = Pt(18)
    r_div = p_div.add_run("―" * 40)
    r_div.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)

    # Helper function for Headings
    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.font.size = Pt(14)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.font.size = Pt(12)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0x2C, 0x52, 0x82)
        return p

    def add_p(text, bold_prefix=None):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.2
        if bold_prefix:
            r_bold = p.add_run(bold_prefix)
            r_bold.font.bold = True
            r_bold.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)
        p.add_run(text)
        return p

    def add_bullet(text, bold_prefix=None):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_bold = p.add_run(bold_prefix)
            r_bold.font.bold = True
            r_bold.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)
        p.add_run(text)
        return p

    # --- CHƯƠNG 1 ---
    add_h1("CHƯƠNG 1: TỔNG QUAN KIẾN TRÚC HỆ THỐNG")
    add_p("Hệ thống xử lý huấn luyện mô hình Machine Learning theo cơ chế Directed Acyclic Graph (DAG). Nguồn vào của hệ thống là sơ đồ các block do người dùng kéo thả trên giao diện Frontend (FE), chuyển thành dạng dữ liệu chuẩn JSON gửi về Backend API.")
    
    add_p("Quy trình xử lý khép kín gồm 6 bước chính:")
    add_bullet("Người dùng kéo thả các Block (Data Source, Preprocessing, Model, Evaluation...) và nối các Edge trên Canvas UI.", "1. Thiết kế Workflow trên FE: ")
    add_bullet("FE gom cấu trúc Nodes và Edges thành 1 file JSON chuẩn gửi lên REST API endpoint /api/workflow/execute.", "2. Gửi JSON DAG về Backend: ")
    add_bullet("Backend kiểm tra tính hợp lệ của Graph (không lặp vòng - Cycles, đúng kiểu dữ liệu kết nối - Data Schema Contract).", "3. Validation & Topological Sort: ")
    add_bullet("Dựa trên thứ tự Topological Sort, Code Generator chuyển các Node thành các đoạn code Python chuẩn tương ứng.", "4. Sinh Code Python (Code Generation): ")
    add_bullet("Backend tạo file script.py và đẩy job sang Celery Worker hoặc Docker Sandbox cách ly để chạy Python.", "5. Thực thi Script (Execution): ")
    add_bullet("Đọc kết quả log stdout, metric đánh giá, và lưu Model artifact (.pkl/.joblib) vào Model Registry / Object Storage.", "6. Lưu Trữ Artifact & Trả Kết Quả: ")

    # --- CHƯƠNG 2 ---
    add_h1("CHƯƠNG 2: MÃ HÓA NỘI DUNG PDF SANG THƯ VIỆN PYTHON (BLOCK MAPPING)")
    add_p("Tất cả 14 Block chức năng mô tả chi tiết trong tài liệu tham khảo PDF đều được ánh xạ trực tiếp sang các thư viện Python phổ biến như pandas, scikit-learn, joblib và lxml:")

    # Table for Block Mapping
    table_data = [
        ["Nhóm Block (PDF)", "Tên Block", "Thư viện & Hàm Python Tương Ước", "Mô tả ngắn gọn"],
        ["1. Data Source", "1.1 Load CSV", "pd.read_csv()", "Đọc file CSV, chọn cột, định dạng missing value"],
        ["", "1.2 Load JSON", "pd.read_json() / pd.json_normalize()", "Giải mã JSON Lines hoặc mảng object lồng nhau"],
        ["", "1.3 Load XML", "pd.read_xml(parser='lxml')", "Trích xuất XML element bằng XPath thành Dataset"],
        ["2. Preprocessing", "2.1 Normalization", "StandardScaler / MinMaxScaler / RobustScaler", "Chuẩn hóa feature số về khoảng ổn định"],
        ["", "2.2 Encoding", "OneHotEncoder / OrdinalEncoder", "Mã hóa cột phân loại (Categorical)"],
        ["", "2.3 Impute Missing", "SimpleImputer(strategy='mean'|'median'|...)", "Thay thế giá trị thiếu bằng thống kê hoặc hằng số"],
        ["", "2.4 Feature Selection", "VarianceThreshold / SelectKBest / RFE", "Lọc bớt feature bằng phương pháp thống kê/mô hình"],
        ["", "2.5 Select Target", "df.drop(columns=[target]), df[target]", "Tách DataFrame thành tập Feature X và Target y"],
        ["", "2.6 Rename Column", "df.rename(columns=mapping)", "Đổi tên cột và kiểm soát trùng lặp tên"],
        ["", "2.7 Concat Features", "pd.concat([df1, df2], axis=1)", "Ghép nhiều Dataset theo hàng hoặc cột"],
        ["3. Data Split", "3.1 Train/Test Split", "train_test_split(X, y, test_size=...)", "Tách dữ liệu train/test có shuffle & stratify"],
        ["4. Model", "4.1 Classification", "RandomForestClassifier / LogisticRegression / SVC", "Huấn luyện mô hình phân loại"],
        ["", "4.2 Clustering", "KMeans(n_clusters=...)", "Phân cụm không giám sát"],
        ["5. Evaluation", "5.1 Evaluation", "accuracy_score / f1_score / silhouette_score", "Đánh giá mô hình thu được"],
        ["6. Persistence", "6.1 Save Model", "joblib.dump(model, filepath)", "Lưu trữ model artifact vào đĩa/cloud storage"]
    ]

    t = doc.add_table(rows=len(table_data), cols=4)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Format Header Row
    for col_idx, text in enumerate(table_data[0]):
        cell = t.cell(0, col_idx)
        set_cell_background(cell, "1B365D")
        set_cell_margins(cell, top=120, bottom=120, left=120, right=120)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(text)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        r.font.size = Pt(9.5)

    # Format Data Rows
    for row_idx in range(1, len(table_data)):
        row = table_data[row_idx]
        bg_color = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, text in enumerate(row):
            cell = t.cell(row_idx, col_idx)
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(text)
            r.font.size = Pt(9.0)

    # Spacing after table
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(6)

    # --- CHƯƠNG 3 ---
    add_h1("CHƯƠNG 3: CẤU TRÚC JSON GRAPH VÀ GIẢI PHÁP THỰC THI (DAG ENGINE)")
    add_p("Frontend truyền một cấu trúc dữ liệu JSON biểu diễn đồ thị DAG gồm mảng các 'nodes' (chứa cấu hình tham số) và 'edges' (chứa luồng kết nối dữ liệu giữa các node).")

    add_h2("3.1 Dạng JSON DAG Mẫu Từ Frontend")
    sample_json = '''{
  "nodes": [
    { "id": "node_load_csv", "type": "LOAD_CSV", "params": { "source": "data.csv", "delimiter": "," } },
    { "id": "node_impute", "type": "IMPUTE_MISSING", "params": { "columns": ["age"], "strategy": "mean" } },
    { "id": "node_select_target", "type": "SELECT_TARGET", "params": { "targetColumn": "purchased" } },
    { "id": "node_split", "type": "TRAIN_TEST_SPLIT", "params": { "testSize": 0.2, "randomState": 42 } },
    { "id": "node_rf", "type": "RANDOM_FOREST", "params": { "nEstimators": 100, "maxDepth": 10 } },
    { "id": "node_eval", "type": "EVALUATION", "params": { "metrics": ["accuracy", "f1"] } },
    { "id": "node_save", "type": "SAVE_MODEL", "params": { "storagePath": "models/rf_v1.pkl" } }
  ],
  "edges": [
    { "source": "node_load_csv", "target": "node_impute", "sourceOutput": "output", "targetInput": "input" },
    { "source": "node_impute", "target": "node_select_target", "sourceOutput": "output", "targetInput": "input" },
    { "source": "node_select_target", "target": "node_split", "sourceOutput": "output", "targetInput": "input" },
    { "source": "node_split", "target": "node_rf", "sourceOutput": "train_data", "targetInput": "train_input" },
    { "source": "node_split", "target": "node_eval", "sourceOutput": "test_data", "targetInput": "test_input" },
    { "source": "node_rf", "target": "node_eval", "sourceOutput": "model", "targetInput": "model" },
    { "source": "node_rf", "target": "node_save", "sourceOutput": "model", "targetInput": "model" }
  ]
}'''
    add_code_block(doc, sample_json)

    add_h2("3.2 Thuật Toán Sắp Xếp Thứ Tự Chạy (Topological Sort)")
    add_p("Để đoạn mã sinh ra chạy đúng logic không bị lỗi 'NameError: name is not defined', các node phải được sắp xếp sao cho Node đầu vào (Input/Data Source) luôn chạy trước Node tiêu thụ (Model/Evaluation). Thuật toán Kahn được sử dụng để xếp hạng thứ tự thực thi:")
    add_bullet("Node_load_csv (Cấp độ 0)")
    add_bullet("Node_impute (Cấp độ 1 - Phụ thuộc Node_load_csv)")
    add_bullet("Node_select_target (Cấp độ 2 - Phụ thuộc Node_impute)")
    add_bullet("Node_split (Cấp độ 3 - Phụ thuộc Node_select_target)")
    add_bullet("Node_rf (Cấp độ 4 - Phụ thuộc Node_split)")
    add_bullet("Node_eval & Node_save (Cấp độ 5 - Phụ thuộc Node_rf & Node_split)")

    # --- CHƯƠNG 4 ---
    add_h1("CHƯƠNG 4: THIẾT KẾ GIẢI PHÁP TRÁNH CONFLICT CODE VÀ ĐỊNH NGHĨA BIẾN")
    add_p("Một thách thức quan trọng khi tự động ghép nối mã nguồn Python là làm sao để tránh đặt trùng tên biến (duplicate variable definition) và xung đột các câu lệnh import.")

    add_h2("4.1 Định Danh Tên Biến Theo Node ID (Unique Variable Scoping)")
    add_p("Không dùng các tên biến dùng chung như 'df', 'x', 'y', 'model'. Thay vào đó, mọi biến tạo ra đều phải gắn hậu tố theo ID của Node tạo ra nó:")
    add_bullet("Node node_load_csv tạo ra biến: df_node_load_csv")
    add_bullet("Node node_impute đọc df_node_load_csv và tạo ra: df_node_impute")
    add_bullet("Node node_split tạo ra 4 biến độc lập: X_train_node_split, X_test_node_split, y_train_node_split, y_test_node_split")
    add_bullet("Node node_rf tạo ra mô hình: model_node_rf")

    add_h2("4.2 Thu Gom và Khử Trùng Lặp Imports (Top-level Import Set)")
    add_p("Mỗi template node sẽ đăng ký các gói thư viện nó cần (ví dụ: 'import pandas as pd'). Khi Code Generator duyệt qua tất cả các Node trong DAG, toàn bộ câu lệnh import sẽ được gom vào một Set() để khử trùng lặp và đẩy lên đầu file .py.")

    # --- CHƯƠNG 5 ---
    add_h1("CHƯƠNG 5: THIẾT KẾ BO ENGINE SINH CODE (CODE GENERATOR ENGINE)")
    add_p("Dưới đây là đoạn mã nguồn TypeScript/Node.js minh họa cách xây dựng Bộ Code Generator hoàn chỉnh:")

    ts_code = '''import { TEMPLATES } from './templates';

export function generatePythonScript(dag: { nodes: any[]; edges: any[] }) {
  const sortedNodes = topologicalSort(dag.nodes, dag.edges);
  const importsSet = new Set<string>();
  const codeBlocks: string[] = [];

  // Map theo dõi biến đầu ra của từng node/port
  const outputVariableMap = new Map<string, string>(); // e.g. "node_split:train_data" -> "X_train_node_split, y_train_node_split"

  for (const node of sortedNodes) {
    const template = TEMPLATES[node.type];
    if (!template) throw new Error(`Unsupported node type: ${node.type}`);

    // 1. Accumulate Top-level Imports
    template.imports.forEach((imp) => importsSet.add(imp));

    // 2. Resolve Input Variable Names from Edges
    const inputs: Record<string, string> = {};
    const inEdges = dag.edges.filter((e) => e.target === node.id);
    for (const edge of inEdges) {
      const parentVar = outputVariableMap.get(`${edge.source}:${edge.sourceOutput}`);
      inputs[edge.targetInput] = parentVar;
    }

    // 3. Generate Block Code
    const blockCode = template.generateCode(node.id, node.params, inputs);
    codeBlocks.push(blockCode);

    // 4. Register Output Variable Names
    registerNodeOutputs(node, outputVariableMap);
  }

  // Combine into complete .py script
  return `
# ====================================================
# AUTO-GENERATED ML PIPELINE SCRIPT
# ====================================================
${Array.from(importsSet).join('\\n')}

def main():
${codeBlocks.map((b) => b.split('\\n').map((l) => '    ' + l).join('\\n')).join('\\n')}

if __name__ == "__main__":
    main()
`;
}'''
    add_code_block(doc, ts_code)

    # --- CHƯƠNG 6 ---
    add_h1("CHƯƠNG 6: SCRIPT PYTHON HOÀN CHỈNH ĐƯỢC SINH RA")
    add_p("Đoạn mã Python hoàn chỉnh dưới đây là kết quả sinh ra tự động từ Code Generator, sẵn sàng thực thi độc lập mà không gặp bất kỳ lỗi nào về biến hay import:")

    py_generated = '''# ====================================================
# AUTO-GENERATED ML PIPELINE SCRIPT
# Generated at: 2026-07-22
# ====================================================
import os
import joblib
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, classification_report

def main():
    # ----------------------------------------------------
    # Node: Load CSV (node_load_csv)
    # ----------------------------------------------------
    df_node_load_csv = pd.read_csv("data.csv", sep=",", encoding="utf-8")

    # ----------------------------------------------------
    # Node: Impute Missing Values (node_impute)
    # ----------------------------------------------------
    df_node_impute = df_node_load_csv.copy()
    imputer_node_impute = SimpleImputer(strategy="mean")
    cols_node_impute = ["age"]
    if cols_node_impute:
        df_node_impute[cols_node_impute] = imputer_node_impute.fit_transform(df_node_impute[cols_node_impute])

    # ----------------------------------------------------
    # Node: Select Target (node_select_target)
    # ----------------------------------------------------
    X_node_select_target = df_node_impute.drop(columns=["purchased"])
    y_node_select_target = df_node_impute["purchased"]

    # ----------------------------------------------------
    # Node: Train/Test Split (node_split)
    # ----------------------------------------------------
    X_train_node_split, X_test_node_split, y_train_node_split, y_test_node_split = train_test_split(
        X_node_select_target, y_node_select_target, test_size=0.2, random_state=42
    )

    # ----------------------------------------------------
    # Node: Random Forest (node_rf)
    # ----------------------------------------------------
    model_node_rf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model_node_rf.fit(X_train_node_split, y_train_node_split)

    # ----------------------------------------------------
    # Node: Evaluation (node_eval)
    # ----------------------------------------------------
    y_pred_node_eval = model_node_rf.predict(X_test_node_split)
    acc_node_eval = accuracy_score(y_test_node_split, y_pred_node_eval)
    f1_node_eval = f1_score(y_test_node_split, y_pred_node_eval, average="weighted")
    print(f"[node_eval] Accuracy: {acc_node_eval:.4f}")
    print(f"[node_eval] F1-Score: {f1_node_eval:.4f}")
    print(classification_report(y_test_node_split, y_pred_node_eval))

    # ----------------------------------------------------
    # Node: Save Model (node_save)
    # ----------------------------------------------------
    os.makedirs(os.path.dirname("models/rf_v1.pkl"), exist_ok=True)
    joblib.dump(model_node_rf, "models/rf_v1.pkl")
    print("Saved model to models/rf_v1.pkl")

if __name__ == "__main__":
    main()'''
    add_code_block(doc, py_generated)

    # --- CHƯƠNG 7 ---
    add_h1("CHƯƠNG 7: ĐỀ XUẤT PHƯƠNG ÁN VẬN HÀNH BẢO MẬT & MỞ RỘNG (EXECUTION STRATEGIES)")
    add_p("Có 3 mô hình triển khai chạy Python script ở phía Backend tương ứng với từng giai đoạn phát triển:")

    add_bullet("Tạo tiến trình con trực tiếp qua child_process.exec() hoặc subprocess.run(). Phù hợp cho giai đoạn phát triển PoC / thử nghiệm nhanh tại local.", "1. Phương án Subprocess (Đơn giản): ")
    add_bullet("Đẩy Job vào Redis queue. Celery Worker phân tán sẽ nhận job, thực thi trong Virtual Environment độc lập và push log thời gian thực về FE thông qua WebSocket.", "2. Phương án Celery Worker Queue (Production Standard): ")
    add_bullet("Khởi tạo Docker Container dùng 1 lần (Ephemeral Container) với giới hạn tài nguyên CPU/RAM nghiêm ngặt. Đây là phương án bảo mật nhất giúp ngăn chặn triệt để nguy cơ tấn công Remote Code Execution (RCE).", "3. Phương án Docker Container Sandbox (Bảo mật tuyệt đối): ")

    # Footer/End note
    p_end = doc.add_paragraph()
    p_end.paragraph_format.space_before = Pt(24)
    p_end.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_e = p_end.add_run("--- HẾT BÁO CÁO ---")
    r_e.font.bold = True
    r_e.font.color.rgb = RGBColor(0x77, 0x77, 0x77)

    output_path = r"d:\ml-training-platform\docs\Tai_lieu_Nghien_cuu_Pipeline_Python_DAG.docx"
    doc.save(output_path)
    print(f"Successfully created docx at: {output_path}")

if __name__ == "__main__":
    build_document()
