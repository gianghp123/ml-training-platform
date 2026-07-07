import type { BlockDefinition } from '@/lib/models';
import type { BlockConfigField } from '../socket-types';


export const LoadCsvExcel: BlockDefinition = {
  id: "load_csv_excel",
  code: "load_csv_excel",
  name: "Load CSV/Excel",
  categoryId: "load_data",
  description: "Đọc dữ liệu dạng bảng từ file .csv hoặc .xlsx và trả về dữ liệu dạng Tabular.",
  configSchema: {
    file_path: {
      type: 'text',
      label: 'File CSV đã upload',
      validation: { required: true },
    } satisfies BlockConfigField,
    delimiter: {
      type: 'text',
      label: 'Ký tự phân tách cột',
      default: ',',
    } satisfies BlockConfigField,
    has_header: {
      type: "switch",
      label: "Dòng đầu là tên cột",
      default: true,
    } satisfies BlockConfigField,
    skip_rows: {
      type: "number",
      label: "Số dòng bỏ qua ở đầu file trước khi tới dữ liệu thật",
      default: 0,
      validation: { min: 0 },
    } satisfies BlockConfigField,
    encoding: {
      type: "select",
      label: "Bảng mã ký tự",
      default: "utf-8",
      options: [
        { label: "UTF-8", value: "utf-8" },
        { label: "ASCII", value: "ascii" },
        { label: "ISO-8859-1", value: "iso-8859-1" },
        { label: "UTF-16", value: "utf-16" },
        { label: "Windows-1252", value: "windows-1252" },
      ],
    } satisfies BlockConfigField,
    expected_columns: {
      type: "textarea",
      label: "Danh sách tên cột kỳ vọng ",
    } satisfies BlockConfigField,
    skip_cols: {
      type: "textarea",
      label: "Danh sách cột cần loại bỏ khỏi dataset ",
    } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: {
    entries: []
  } as Record<string, unknown>,
  outputSchema: {
    entries: [
      { id: 'dataset', type: 'dataset', label: 'Dataset' },
    ],
  } as Record<string, unknown>,
}

export const LoadJsonBlock: BlockDefinition = {
  id: "load_json",
  code: "load_json",
  name: "Load JSON",
  categoryId: "load_data",
  description:
    "Đọc dữ liệu từ file .json. Output type phụ thuộc vào tham số flatten_nested.",
  configSchema: {
    file_path: {
      type: "text",
      label: "File JSON đã upload",
      validation: { required: true },
    } satisfies BlockConfigField,
    root_key: {
      type: "text",
      label: "Đường dẫn tới mảng record gốc",
    } satisfies BlockConfigField,
    flatten_nested: {
      type: "switch",
      label: "Tự động làm phẳng các trường lồng nhau",
      default: true,
    } satisfies BlockConfigField,
    max_nesting_depth: {
      type: "number",
      label: "Độ sâu lồng nhau tối đa được phép flatten tự động",
      default: 3,
      validation: { min: 1 },
    } satisfies BlockConfigField,
    array_handling: {
      type: "select",
      label: "Cách xử lý khi 1 field là mảng con",
      default: "flatten_index",
      options: [
        { label: "Tách thành nhiều cột", value: "flatten_index" },
        { label: "Nối thành 1 chuỗi", value: "join_string" },
        { label: "Từ chối và báo lỗi", value: "reject" },
      ],
    } satisfies BlockConfigField,
    encoding: {
      type: "select",
      label: "Bảng mã ký tự",
      default: "utf-8",
      options: [
        { label: "UTF-8", value: "utf-8" },
        { label: "ASCII", value: "ascii" },
        { label: "ISO-8859-1", value: "iso-8859-1" },
        { label: "UTF-16", value: "utf-16" },
        { label: "Windows-1252", value: "windows-1252" },
      ],
    } satisfies BlockConfigField,
    skip_cols: {
      type: "textarea",
      label: "Danh sách cột cần loại bỏ khỏi dataset",
    } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: {
    entries: []
  } as Record<string, unknown>,
  outputSchema: {
    entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' },]
  } as Record<string, unknown>,
}


export const LoadXmlBlock: BlockDefinition = {
  id: "load_xml",
  code: "load_xml",
  name: "Load XML",
  categoryId: "load_data",
  description:
    "Đọc dữ liệu từ file .xml do người dùng upload. Vì cấu trúc XML rất đa dạng, người dùng bắt buộc phải khai báo record_xpath để hệ thống biết đâu là 1 'dòng dữ liệu'.",
  configSchema: {
    file_path: {
      type: "text",
      label: "File XML đã upload",
      validation: { required: true },
    } satisfies BlockConfigField,
    record_xpath: {
      type: "text",
      label: "XPath xác định element nào là 1 record",
      validation: { required: true },
    } satisfies BlockConfigField,
    include_attributes: {
      type: "switch",
      label: "Gộp attribute của element vào thành cột",
      default: true,
    } satisfies BlockConfigField,
    max_nesting_depth: {
      type: "number",
      label: "Độ sâu lồng nhau tối đa được phép flatten tự động",
      default: 3,
      validation: { min: 1 },
    } satisfies BlockConfigField,
    encoding: {
      type: "select",
      label: "Bảng mã ký tự",
      default: "utf-8",
      options: [
        { label: "UTF-8", value: "utf-8" },
        { label: "ASCII", value: "ascii" },
        { label: "ISO-8859-1", value: "iso-8859-1" },
        { label: "UTF-16", value: "utf-16" },
        { label: "Windows-1252", value: "windows-1252" },
      ],
    } satisfies BlockConfigField,
    skip_cols: {
      type: "textarea",
      label: "Danh sách cột cần loại bỏ khỏi dataset",
    } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: {
    entries: []
  } as Record<string, unknown>,
  outputSchema: {
    entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' },],
  } as Record<string, unknown>,
}

