import { BadRequestException } from '@nestjs/common';
import {
  ErrorCode,
  type GuestColumnMapping,
  type GuestFileEncoding,
  type GuestImportRowError,
  MAX_GUEST_FILE_BYTES,
  MAX_GUEST_IMPORT_COLUMNS,
  MAX_GUEST_IMPORT_ROWS,
} from '@playora/contracts';
import ExcelJS from 'exceljs';

export interface ParsedSheetRow {
  /** 1-based spreadsheet row number (row 1 is header, data starts at row 2). */
  rowNumber: number;
  cells: string[];
}

export interface ParsedGuestSheet {
  headers: string[];
  rows: ParsedSheetRow[];
}

export interface ValidatedGuestRow {
  externalCode: string;
  displayName: string;
  team: string | null;
  attributes: Record<string, string>;
}

export interface MappedGuestSheet {
  validRows: ValidatedGuestRow[];
  skipped: number;
  errors: GuestImportRowError[];
}

const CODE_HEADER_ALIASES = new Set([
  'externalcode',
  'external_code',
  'code',
  'id',
  'employee_id',
  'employeeid',
  'ma_nv',
  'manv',
  'mã nv',
  'mã nhân viên',
  'ma nhan vien',
  'mã khách',
  'ma_khach',
]);

const NAME_HEADER_ALIASES = new Set([
  'displayname',
  'display_name',
  'name',
  'fullname',
  'full_name',
  'ho_ten',
  'hoten',
  'họ tên',
  'họ và tên',
  'ho va ten',
  'tên',
  'ten',
]);

const TEAM_HEADER_ALIASES = new Set([
  'team',
  'department',
  'dept',
  'group',
  'phong_ban',
  'phongban',
  'phòng ban',
  'phong ban',
  'đội',
  'doi',
  'nhóm',
  'nhom',
]);

function detectFileKind(fileName: string): 'csv' | 'xlsx' {
  const lower = fileName.trim().toLowerCase();
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.xlsx')) return 'xlsx';
  throw new BadRequestException({
    code: ErrorCode.VALIDATION_FAILED,
    message: 'Unsupported file format; expected .csv or .xlsx',
    details: { field: 'fileName' },
  });
}

export type CsvDelimiter = ',' | ';' | '\t';

function decodeBase64Bytes(content: string): Buffer {
  const stripped = content.replace(/^data:[^,]*;base64,/, '').replace(/\s+/g, '');
  if (!stripped || stripped.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(stripped)) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Invalid base64 file content',
      details: { field: 'content' },
    });
  }
  const padding = stripped.endsWith('==') ? 2 : stripped.endsWith('=') ? 1 : 0;
  const estimatedDecodedBytes = (stripped.length * 3) / 4 - padding;
  if (estimatedDecodedBytes > MAX_GUEST_FILE_BYTES) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: `Decoded file size exceeds maximum of ${MAX_GUEST_FILE_BYTES} bytes`,
      details: { field: 'content' },
    });
  }
  const buffer = Buffer.from(stripped, 'base64');
  if (buffer.byteLength > MAX_GUEST_FILE_BYTES) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: `Decoded file size exceeds maximum of ${MAX_GUEST_FILE_BYTES} bytes`,
      details: { field: 'content' },
    });
  }
  return buffer;
}

function decodeCsvText(content: string, encoding: GuestFileEncoding): string {
  let raw: string;
  if (encoding === 'base64') {
    raw = decodeBase64Bytes(content).toString('utf8');
  } else {
    if (Buffer.byteLength(content, 'utf8') > MAX_GUEST_FILE_BYTES) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Decoded file size exceeds maximum of ${MAX_GUEST_FILE_BYTES} bytes`,
        details: { field: 'content' },
      });
    }
    raw = content;
  }
  return raw.startsWith('\uFEFF') ? raw.slice(1) : raw;
}

/**
 * Auto-detects the CSV delimiter from the header line among `,`, `;`, and `\t`
 * (Vietnamese Excel exports commonly use `;`). Characters inside double quotes are ignored.
 */
export function detectCsvDelimiter(text: string): CsvDelimiter {
  const counts: Record<CsvDelimiter, number> = { ',': 0, ';': 0, '\t': 0 };
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === undefined) continue;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          i++;
        } else {
          inQuotes = false;
        }
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === '\r' || ch === '\n') {
      break;
    } else if (ch === ',' || ch === ';' || ch === '\t') {
      counts[ch]++;
    }
  }

  let best: CsvDelimiter = ',';
  for (const candidate of [',', ';', '\t'] as const) {
    if (counts[candidate] > counts[best]) {
      best = candidate;
    }
  }
  return best;
}

/** RFC 4180 CSV parser supporting quoted fields, escaped quotes, CRLF/LF newlines, and custom delimiter. */
function parseCsvRows(text: string, delimiter: CsvDelimiter): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === undefined) continue;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      currentRow.push(currentField);
      currentField = '';
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else if (ch === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }

  if (inQuotes) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Malformed CSV: unclosed quoted field',
      details: { field: 'content' },
    });
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function parseCsvSheet(content: string, encoding: GuestFileEncoding): ParsedGuestSheet {
  const text = decodeCsvText(content, encoding);
  const delimiter = detectCsvDelimiter(text);
  const rawRows = parseCsvRows(text, delimiter);
  if (rawRows.length === 0) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'CSV file is empty',
      details: { field: 'content' },
    });
  }

  const firstRow = rawRows[0];
  const headers = firstRow ? firstRow.map((h) => h.trim()) : [];
  if (headers.length === 0 || headers.every((h) => h === '')) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'CSV file has no header row',
      details: { field: 'content' },
    });
  }

  if (headers.length > MAX_GUEST_IMPORT_COLUMNS) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: `File exceeds maximum of ${MAX_GUEST_IMPORT_COLUMNS} columns`,
      details: { field: 'content' },
    });
  }

  const rows: ParsedSheetRow[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    const raw = rawRows[i];
    if (!raw) continue;
    // Ignore a blank line with no delimiters (e.g. trailing newline).
    if (raw.length === 1 && (raw[0] ?? '').trim() === '') continue;
    const cells = headers.map((_, colIdx) => (raw[colIdx] ?? '').trim());
    rows.push({ rowNumber: i + 1, cells });
    if (rows.length > MAX_GUEST_IMPORT_ROWS) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Import exceeds maximum of ${MAX_GUEST_IMPORT_ROWS} rows`,
        details: { field: 'content' },
      });
    }
  }

  return { headers, rows };
}

function cellToString(cell: ExcelJS.Cell): string {
  const val = cell.value;
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') {
    if ('richText' in val && Array.isArray(val.richText)) {
      return val.richText
        .map((part) => part.text)
        .join('')
        .trim();
    }
    if ('text' in val && typeof val.text === 'string') {
      return val.text.trim();
    }
    if ('result' in val && val.result !== undefined && val.result !== null) {
      return String(val.result).trim();
    }
  }
  return cell.text ? cell.text.trim() : '';
}

/**
 * Parses a base64-encoded XLSX workbook. Multi-sheet workbooks always use the first worksheet
 * (`workbook.worksheets[0]`); any additional sheets are ignored.
 */
async function parseXlsxSheet(
  content: string,
  encoding: GuestFileEncoding,
): Promise<ParsedGuestSheet> {
  if (encoding !== 'base64') {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'XLSX files must use base64 encoding',
      details: { field: 'encoding' },
    });
  }

  const buffer = decodeBase64Bytes(content);
  // XLSX is a PKZIP container starting with 0x50 0x4b 0x03 0x04.
  if (
    buffer.length < 4 ||
    buffer[0] !== 0x50 ||
    buffer[1] !== 0x4b ||
    buffer[2] !== 0x03 ||
    buffer[3] !== 0x04
  ) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Invalid XLSX file',
      details: { field: 'content' },
    });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Failed to parse XLSX file',
      details: { field: 'content' },
    });
  }

  // Always select the first worksheet when the workbook contains multiple sheets.
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'XLSX file contains no worksheets',
      details: { field: 'content' },
    });
  }

  const headerRow = worksheet.getRow(1);
  const maxCol = Math.min(
    Math.max(worksheet.columnCount, headerRow.cellCount),
    MAX_GUEST_IMPORT_COLUMNS + 64,
  );
  const rawHeaders: string[] = [];
  for (let col = 1; col <= maxCol; col++) {
    rawHeaders.push(cellToString(headerRow.getCell(col)));
  }
  while (rawHeaders.length > 0 && rawHeaders.at(-1) === '') {
    rawHeaders.pop();
  }

  if (rawHeaders.length === 0 || rawHeaders.every((h) => h === '')) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'XLSX worksheet has no header row',
      details: { field: 'content' },
    });
  }

  if (rawHeaders.length > MAX_GUEST_IMPORT_COLUMNS) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: `File exceeds maximum of ${MAX_GUEST_IMPORT_COLUMNS} columns`,
      details: { field: 'content' },
    });
  }

  const rows: ParsedSheetRow[] = [];
  const totalRowCount = worksheet.rowCount;
  for (let r = 2; r <= totalRowCount; r++) {
    const row = worksheet.getRow(r);
    if (!row.hasValues) continue;
    const cells = rawHeaders.map((_, idx) => cellToString(row.getCell(idx + 1)));
    rows.push({ rowNumber: r, cells });
    if (rows.length > MAX_GUEST_IMPORT_ROWS) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Import exceeds maximum of ${MAX_GUEST_IMPORT_ROWS} rows`,
        details: { field: 'content' },
      });
    }
  }

  return { headers: rawHeaders, rows };
}

export async function parseGuestFile(
  fileName: string,
  content: string,
  encoding: GuestFileEncoding,
): Promise<ParsedGuestSheet> {
  const kind = detectFileKind(fileName);
  if (kind === 'csv') return parseCsvSheet(content, encoding);
  return parseXlsxSheet(content, encoding);
}

export function suggestColumnMapping(headers: string[]): GuestColumnMapping {
  const findByAliases = (aliases: Set<string>) =>
    headers.find((h) => aliases.has(h.trim().toLowerCase()));

  const externalCode = findByAliases(CODE_HEADER_ALIASES) ?? headers[0] ?? 'externalCode';
  const displayName =
    findByAliases(NAME_HEADER_ALIASES) ??
    headers.find((h) => h !== externalCode) ??
    headers[0] ??
    'displayName';
  const team = findByAliases(TEAM_HEADER_ALIASES);

  return {
    externalCode,
    displayName,
    ...(team ? { team } : {}),
  };
}

function findHeaderIndex(headers: string[], columnName: string | undefined): number {
  if (!columnName) return -1;
  const trimmed = columnName.trim();
  if (!trimmed) return -1;
  const exact = headers.indexOf(trimmed);
  if (exact !== -1) return exact;
  const lower = trimmed.toLowerCase();
  return headers.findIndex((h) => h.trim().toLowerCase() === lower);
}

export function mapAndValidateRows(
  sheet: ParsedGuestSheet,
  mapping: GuestColumnMapping,
): MappedGuestSheet {
  const codeIdx = findHeaderIndex(sheet.headers, mapping.externalCode);
  const nameIdx = findHeaderIndex(sheet.headers, mapping.displayName);

  if (codeIdx === -1 || nameIdx === -1) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Mapped columns externalCode and displayName must exist in the file headers',
      details: { field: 'mapping' },
    });
  }

  const teamIdx = findHeaderIndex(sheet.headers, mapping.team);
  const extraIndices = sheet.headers
    .map((header, idx) => ({ header, idx }))
    .filter(
      ({ header, idx }) => header !== '' && idx !== codeIdx && idx !== nameIdx && idx !== teamIdx,
    );

  const validRows: ValidatedGuestRow[] = [];
  const errors: GuestImportRowError[] = [];
  let skipped = 0;

  for (const { rowNumber, cells } of sheet.rows) {
    const externalCode = (cells[codeIdx] ?? '').trim();
    const displayName = (cells[nameIdx] ?? '').trim();
    const rawTeam = teamIdx >= 0 ? (cells[teamIdx] ?? '').trim() : '';
    const team = rawTeam.length > 0 ? rawTeam : null;

    if (!externalCode) {
      errors.push({ row: rowNumber, message: 'Missing externalCode' });
      skipped++;
      continue;
    }
    if (externalCode.length > 120) {
      errors.push({ row: rowNumber, message: 'externalCode exceeds 120 characters' });
      skipped++;
      continue;
    }
    if (!displayName) {
      errors.push({ row: rowNumber, message: 'Missing displayName' });
      skipped++;
      continue;
    }
    if (displayName.length > 200) {
      errors.push({ row: rowNumber, message: 'displayName exceeds 200 characters' });
      skipped++;
      continue;
    }
    if (team && team.length > 120) {
      errors.push({ row: rowNumber, message: 'team exceeds 120 characters' });
      skipped++;
      continue;
    }

    const attributes: Record<string, string> = {};
    for (const { header, idx } of extraIndices) {
      const value = (cells[idx] ?? '').trim();
      if (value !== '') {
        attributes[header] = value;
      }
    }

    validRows.push({
      externalCode,
      displayName,
      team,
      attributes,
    });
  }

  return { validRows, skipped, errors };
}
