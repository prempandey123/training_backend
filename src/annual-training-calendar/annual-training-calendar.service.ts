import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnualTrainingCalendar } from './annual-training-calendar.entity';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';

type ImportResult = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};

const MONTH_KEYS = [
  { col: "apr25", headerHints: ["apr", "apr25", "apr'25", "apr 25"] },
  { col: "may25", headerHints: ["may", "may25", "may'25", "may 25"] },
  { col: "jun25", headerHints: ["jun", "jun25", "jun'25", "jun 25"] },
  { col: "jul25", headerHints: ["jul", "jul25", "jul'25", "jul 25"] },
  { col: "aug25", headerHints: ["aug", "aug25", "aug'25", "aug 25"] },
  { col: "sep25", headerHints: ["sep", "sep25", "sep'25", "sep 25"] },
  { col: "oct25", headerHints: ["oct", "oct25", "oct'25", "oct 25"] },
  { col: "nov25", headerHints: ["nov", "nov25", "nov'25", "nov 25"] },
  { col: "dec25", headerHints: ["dec", "dec25", "dec'25", "dec 25"] },
  { col: "jan26", headerHints: ["jan", "jan26", "jan'26", "jan 26"] },
  { col: "feb26", headerHints: ["feb", "feb26", "feb'26", "feb 26"] },
  { col: "mar26", headerHints: ["mar", "mar26", "mar'26", "mar 26"] },
] as const;

function normHeader(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[._-]/g, '')
    .replace(/['’]/g, '')
    .trim();
}

function asText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  // exceljs might give rich objects
  const anyV = v as any;
  if (anyV?.text) return String(anyV.text).trim();
  if (anyV?.result) return String(anyV.result).trim();
  return String(v).trim();
}

function parseTickOrNumber(v: unknown): number {
  const t = asText(v);
  if (!t) return 0;

  // numeric
  const n = Number(t);
  if (!Number.isNaN(n) && Number.isFinite(n)) return Math.max(0, Math.trunc(n));

  // common tick symbols (PDF extracted sometimes becomes a square/box)
  const tickLike = ['✓', '✔', 'Y', 'YES', 'T', 'TRUE', '☑', '◻', '□', '■', '⌂'];
  if (tickLike.includes(t.toUpperCase()) || tickLike.includes(t)) return 1;

  // any non-empty non-numeric -> treat as tick
  return 1;
}

@Injectable()
export class AnnualTrainingCalendarService {
  constructor(
    @InjectRepository(AnnualTrainingCalendar)
    private readonly repo: Repository<AnnualTrainingCalendar>,
  ) {}

  async listAll() {
    return this.repo.find({ order: { srNo: 'ASC', id: 'ASC' } });
  }

  async importFile(file: Express.Multer.File, academicYear = '2025-26'): Promise<ImportResult> {
    if (!file) throw new BadRequestException('File required');

    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      throw new BadRequestException('Only .xlsx / .xls / .csv supported');
    }

    const wb = new ExcelJS.Workbook();

    if (ext === 'csv') {
      const stream = Readable.from(file.buffer);
      await wb.csv.read(stream);
    } else {
      // exceljs typings can be picky with Node's generic Buffer types in newer TS/node versions.
      // Normalize to a plain Buffer instance.
      const buf = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer as any);
      await wb.xlsx.load(buf as any);
    }

    const ws = wb.worksheets[0];
    if (!ws) throw new BadRequestException('No worksheet found');

    // Find header row: first row that contains programme code + programme name fields
    let headerRowNumber = 1;
    for (let r = 1; r <= Math.min(20, ws.rowCount); r++) {
      const row = ws.getRow(r);
      const values = row.values as any[];
      const joined = values.map((x) => normHeader(x)).join('|');
      if (joined.includes('trainingprogrammecode') && (joined.includes('programmename') || joined.includes('programname'))) {
        headerRowNumber = r;
        break;
      }
    }

    const headerRow = ws.getRow(headerRowNumber);
    const headerMap = new Map<string, number>();
    headerRow.eachCell((cell, colNumber) => {
      const key = normHeader(cell.value);
      if (key) headerMap.set(key, colNumber);
    });

    const colFor = (hints: ReadonlyArray<string>) => {
      for (const h of hints) {
        const k = normHeader(h);
        if (headerMap.has(k)) return headerMap.get(k)!;
      }
      // fallback: partial match
      for (const [k, col] of headerMap.entries()) {
        if (hints.some((h) => k.includes(normHeader(h)))) return col;
      }
      return undefined;
    };

    const srCol = colFor(['srno', 'sr.no', 'sr']);
    const codeCol = colFor(['trainingprogrammecode', 'programme code', 'programcode']);
    const nameCol = colFor(['programmename', 'programme name', 'programname']);
    const modeCol = colFor(['modeofsession', 'mode']);
    const facCol = colFor(['nameoffaculties', 'faculties', 'faculty']);
    const partCol = colFor(['participants']);
    const deptCol = colFor(['department']);
    const totalCol = colFor(['totalsessions', 'total sessions', 'totalsession']);
    const overallCol = colFor(['overallsessions', 'overall sessions', 'overallsession']);

    if (!codeCol || !nameCol) {
      throw new BadRequestException('Header mismatch: Training Programme Code / Programme Name columns not found.');
    }

    const monthCols = MONTH_KEYS.map((m) => ({
      key: m.col,
      col: colFor(m.headerHints),
    }));

    const result: ImportResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };

    // Data starts after header row
    for (let r = headerRowNumber + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const code = asText(codeCol ? row.getCell(codeCol).value : '');
      const progName = asText(nameCol ? row.getCell(nameCol).value : '');

      // skip empty rows
      if (!code && !progName) {
        result.skipped++;
        continue;
      }

      if (!code || !progName) {
        result.errors.push({ row: r, message: 'Training Programme Code / Programme Name missing' });
        continue;
      }

      try {
        const entity = new AnnualTrainingCalendar();
        entity.srNo = srCol ? Number(asText(row.getCell(srCol).value) || 0) : null;
        entity.trainingProgrammeCode = code;
        entity.programmeName = progName;
        entity.modeOfSession = modeCol ? asText(row.getCell(modeCol).value) || null : null;
        entity.facultyName = facCol ? asText(row.getCell(facCol).value) || null : null;
        entity.participants = partCol ? asText(row.getCell(partCol).value) || null : null;
        entity.department = deptCol ? asText(row.getCell(deptCol).value) || null : null;

        for (const m of monthCols) {
          const val = m.col ? parseTickOrNumber(row.getCell(m.col).value) : 0;
          (entity as any)[m.key] = val;
        }

        const total = totalCol ? parseTickOrNumber(row.getCell(totalCol).value) : 0;
        const overall = overallCol ? parseTickOrNumber(row.getCell(overallCol).value) : 0;
        entity.totalSessions = total;
        entity.overallSessions = overall || total;
        entity.academicYear = academicYear;

        // upsert based on unique index
        const existing = await this.repo.findOne({
          where: { trainingProgrammeCode: code, programmeName: progName },
        });

        if (existing) {
          const merged = this.repo.merge(existing, entity);
          await this.repo.save(merged);
          result.updated++;
        } else {
          await this.repo.save(entity);
          result.inserted++;
        }
      } catch (e: any) {
        result.errors.push({ row: r, message: e?.message || 'Unknown error' });
      }
    }

    return result;
  }
}
