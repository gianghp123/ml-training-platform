import { Injectable } from '@nestjs/common';
import { Column, DatasetProfile, inferColumns, ValidationOptions } from '@training-ml/contracts';
import * as chardet from 'chardet';
import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import { StorageService } from 'src/modules/storage/storage.service';
import { scanCsv } from '../utils/csv-scanner';
import { scanJsonArray } from '../utils/json-scanner';
import { scanXml } from '../utils/xml-scanner';

const SAMPLE_ROW_LIMIT = 500;
const STREAM_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5MB — below this, buffer instead of stream

@Injectable()
export class DatasetValidationService {
  constructor(private readonly storageService: StorageService) { }

  /**
   * `objectKey` is the MinIO object key (e.g. `dataset.storageUri`), not a
   * local path. The file is streamed to a temp file for the duration of
   * validation and removed afterward regardless of success or failure.
   */
  async validate(
    objectKey: string,
    options?: ValidationOptions,
  ): Promise<DatasetProfile> {
    const extension = objectKey.split('.').pop()?.toLowerCase();

    return this.storageService.withTempFile(objectKey, async (localPath) => {
      switch (extension) {
        case 'csv':
          return this.validateCsv(localPath, options);
        case 'json':
          return this.validateJson(localPath, options);
        case 'xml':
          return this.validateXml(localPath, options);
        default:
          throw new Error(`Unsupported file format: ${extension}`);
      }
    });
  }

  // ---- format handlers ----

  private async validateCsv(
    localPath: string,
    options?: ValidationOptions,
  ): Promise<DatasetProfile> {
    const fd = fs.openSync(localPath, 'r');
    const peek = Buffer.alloc(4096);
    const bytesRead = fs.readSync(fd, peek, 0, 4096, 0);
    fs.closeSync(fd);

    const detected = chardet.detect(peek.subarray(0, bytesRead));
    const encodingLabel = options?.csv?.encoding ?? detected ?? 'utf-8';
    const bufferEncoding = this.toBufferEncoding(encodingLabel);
    const sampleSize = options?.sampleSize ?? SAMPLE_ROW_LIMIT;

    const { delimiter, hasHeader, sample, rowCount } = await scanCsv(
      localPath,
      bufferEncoding,
      sampleSize,
      options?.csv?.delimiter,
      options?.csv?.hasHeader,
    );

    const columns = inferColumns(sample, sample.length, options?.columnOverrides);
    const warnings = this.buildWarnings(columns, options);

    return {
      format: 'csv',
      delimiter,
      hasHeader,
      encoding: encodingLabel,
      rowCount,
      columns,
      sampled: rowCount > sample.length,
      sampledRows: sample.length,
      warnings: warnings.length ? warnings : undefined,
    };
  }

  private async validateJson(
    localPath: string,
    options?: ValidationOptions,
  ): Promise<DatasetProfile> {
    const { size } = fs.statSync(localPath);
    const sampleSize = options?.sampleSize ?? SAMPLE_ROW_LIMIT;

    if (size > STREAM_THRESHOLD_BYTES) {
      const { sample, recordCount } = await scanJsonArray(
        localPath,
        options?.json?.recordsPath,
        sampleSize,
      );
      const schema = sample.length
        ? inferColumns(sample, sample.length, options?.columnOverrides)
        : 'unknown';
      const warnings = this.buildWarnings(schema, options);

      return {
        format: 'json',
        rootType: options?.json?.recordsPath ? 'object' : 'array',
        recordCount,
        schema,
        sampled: recordCount > sample.length,
        sampledRows: sample.length,
        warnings: warnings.length ? warnings : undefined,
      };
    }

    // Small enough to buffer fully — simpler and just as correct.
    const parsed = JSON.parse(fs.readFileSync(localPath, 'utf-8'));

    if (Array.isArray(parsed)) {
      const records = this.asRecordArray(parsed);
      const sample = records.slice(0, sampleSize);
      const schema = sample.length
        ? inferColumns(sample, sample.length, options?.columnOverrides)
        : 'unknown';
      const warnings = this.buildWarnings(schema, options);

      return {
        format: 'json',
        rootType: 'array',
        recordCount: parsed.length,
        schema,
        sampled: parsed.length > sample.length,
        sampledRows: sample.length,
        warnings: warnings.length ? warnings : undefined,
      };
    }

    if (typeof parsed === 'object' && parsed !== null) {
      const nestedArray = options?.json?.recordsPath
        ? this.getByPath(parsed, options.json.recordsPath)
        : Object.values(parsed).find((v) => Array.isArray(v));

      if (Array.isArray(nestedArray)) {
        const records = this.asRecordArray(nestedArray);
        const sample = records.slice(0, sampleSize);
        const schema = sample.length
          ? inferColumns(sample, sample.length, options?.columnOverrides)
          : 'unknown';
        const warnings = this.buildWarnings(schema, options);

        return {
          format: 'json',
          rootType: 'object',
          recordCount: nestedArray.length,
          schema,
          sampled: nestedArray.length > sample.length,
          sampledRows: sample.length,
          warnings: warnings.length ? warnings : undefined,
        };
      }

      // No array field found — treat the object itself as a single record.
      const schema = inferColumns(
        [parsed as Record<string, unknown>],
        1,
        options?.columnOverrides,
      );
      const warnings = this.buildWarnings(schema, options);

      return {
        format: 'json',
        rootType: 'object',
        recordCount: 1,
        schema,
        sampled: false,
        sampledRows: 1,
        warnings: warnings.length ? warnings : undefined,
      };
    }

    throw new Error('JSON root must be an array or object');
  }

  private async validateXml(
    localPath: string,
    options?: ValidationOptions,
  ): Promise<DatasetProfile> {
    const { size } = fs.statSync(localPath);
    const sampleSize = options?.sampleSize ?? SAMPLE_ROW_LIMIT;

    if (size > STREAM_THRESHOLD_BYTES) {
      const { rootElement, recordElement, sample, recordCount } = await scanXml(
        localPath,
        options?.xml?.recordElement,
        sampleSize,
      );
      const schema = sample.length
        ? inferColumns(sample, sample.length, options?.columnOverrides)
        : 'unknown';
      const warnings = this.buildWarnings(schema, options);

      return {
        format: 'xml',
        rootElement,
        recordElement,
        recordCount,
        schema,
        sampled: recordCount > sample.length,
        sampledRows: sample.length,
        warnings: warnings.length ? warnings : undefined,
      };
    }

    const raw = fs.readFileSync(localPath, 'utf-8');
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(raw);

    const rootElement = Object.keys(parsed)[0];
    const { recordElement, records } = options?.xml?.recordElement
      ? this.findRecordArrayByName(parsed[rootElement], options.xml.recordElement)
      : this.findRecordArray(parsed[rootElement]);

    const flatRecords = records.map((r) => this.flattenXmlRecord(r));
    const sample = flatRecords.slice(0, sampleSize);
    const schema = sample.length
      ? inferColumns(sample, sample.length, options?.columnOverrides)
      : 'unknown';
    const warnings = this.buildWarnings(schema, options);

    return {
      format: 'xml',
      rootElement,
      recordElement,
      recordCount: records.length,
      schema,
      sampled: records.length > sample.length,
      sampledRows: sample.length,
      warnings: warnings.length ? warnings : undefined,
    };
  }

  // ---- shared warning logic ----

  /**
   * Checks columnOverrides and requiredColumns against the inferred
   * columns/schema and returns human-readable warning strings. Both are
   * treated as non-fatal here — validation still succeeds, but the caller
   * (e.g. the queue processor) can inspect `warnings` and decide whether
   * a missing required column should actually fail the job.
   */
  private buildWarnings(
    columns: Column[] | 'unknown',
    options?: ValidationOptions,
  ): string[] {
    const warnings: string[] = [];
    if (columns === 'unknown') {
      if (options?.requiredColumns?.length) {
        warnings.push(
          `Could not verify required columns (${options.requiredColumns.join(', ')}): schema could not be inferred`,
        );
      }
      return warnings;
    }

    const columnNames = new Set(columns.map((c) => c.name));

    for (const override of options?.columnOverrides ?? []) {
      if (!columnNames.has(override.name)) {
        warnings.push(
          `Column override "${override.name}" does not match any column in the data`,
        );
      }
    }

    const missingRequired = (options?.requiredColumns ?? []).filter(
      (name) => !columnNames.has(name),
    );
    if (missingRequired.length) {
      warnings.push(`Missing required column(s): ${missingRequired.join(', ')}`);
    }

    return warnings;
  }

  // ---- generic helpers ----

  private toBufferEncoding(detected: string | null): BufferEncoding {
    const supported: Record<string, BufferEncoding> = {
      'utf-8': 'utf8',
      utf8: 'utf8',
      ascii: 'ascii',
      'us-ascii': 'ascii',
      'utf-16le': 'utf16le',
      'utf-16': 'utf16le',
    };
    return supported[(detected ?? '').toLowerCase()] ?? 'utf8';
  }

  private asRecordArray(arr: unknown[]): Record<string, unknown>[] {
    return arr.filter(
      (r): r is Record<string, unknown> =>
        typeof r === 'object' && r !== null && !Array.isArray(r),
    );
  }

  private getByPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce((acc: any, key) => acc?.[key], obj);
  }

  private findRecordArray(
    node: unknown,
  ): { recordElement?: string; records: Record<string, unknown>[] } {
    if (Array.isArray(node)) {
      return { records: node as Record<string, unknown>[] };
    }
    if (typeof node === 'object' && node !== null) {
      for (const [key, value] of Object.entries(node)) {
        if (Array.isArray(value)) {
          return { recordElement: key, records: value as Record<string, unknown>[] };
        }
      }
      return { records: [node as Record<string, unknown>] };
    }
    return { records: [] };
  }

  private findRecordArrayByName(
    node: unknown,
    name: string,
  ): { recordElement: string; records: Record<string, unknown>[] } {
    if (typeof node === 'object' && node !== null && name in (node as any)) {
      const value = (node as any)[name];
      const records = Array.isArray(value) ? value : [value];
      return { recordElement: name, records };
    }
    return { recordElement: name, records: [] };
  }

  private flattenXmlRecord(record: unknown, prefix = ''): Record<string, unknown> {
    if (typeof record !== 'object' || record === null) {
      return { [prefix || 'value']: record };
    }
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenXmlRecord(value, path));
      } else {
        result[path] = Array.isArray(value) ? value.join(',') : value;
      }
    }
    return result;
  }
}
