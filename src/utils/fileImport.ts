import Taro from '@tarojs/taro';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { callFunction } from '../services/cloud';
import { parseQuestions, ParseResult, ParsedQuestion, TYPE_MAP } from './parse';
import { QuestionType } from '../types';

export type FileKind = 'sheet' | 'doc' | 'pdf';

export interface PickedFile {
  name: string;
  buffer: ArrayBuffer;
  path?: string; // 微信临时文件路径（PDF 走云函数解析时需要）
}

const isWeapp = process.env.TARO_ENV === 'weapp';

const KIND_META: Record<FileKind, { ext: string[]; accept: string }> = {
  sheet: { ext: ['xlsx', 'xls', 'csv'], accept: '.xlsx,.xls,.csv' },
  doc: { ext: ['docx', 'txt'], accept: '.docx,.txt' },
  pdf: { ext: ['pdf'], accept: '.pdf' },
};

/** 选择指定类型的文件 */
export async function pickFile(kind: FileKind): Promise<PickedFile> {
  const meta = KIND_META[kind];
  if (isWeapp) {
    // 微信小程序：从聊天记录选择文件（文件需先发给自己或文件传输助手）
    const res = await Taro.chooseMessageFile({ count: 1, type: 'file', extension: meta.ext });
    const f = res.tempFiles && res.tempFiles[0];
    if (!f) throw new Error('未选择文件');
    const b64 = Taro.getFileSystemManager().readFileSync(f.path, 'base64') as string;
    return { name: f.name, buffer: Taro.base64ToArrayBuffer(b64), path: f.path };
  }
  // Web 预览：原生文件选择
  return pickFileH5(meta.accept);
}

function pickFileH5(accept: string): Promise<PickedFile> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (input.parentNode) input.parentNode.removeChild(input);
      if (!file) {
        reject(new Error('CANCEL'));
        return;
      }
      const buffer = await file.arrayBuffer();
      resolve({ name: file.name, buffer });
    };
    document.body.appendChild(input);
    input.click();
  });
}

/** ArrayBuffer 转 base64（分块，避免栈溢出） */
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)) as unknown as number[]);
  }
  return btoa(binary);
}

/** ArrayBuffer 按 UTF-8 解码为文本 */
export function textFromBuffer(buffer: ArrayBuffer): string {
  return new TextDecoder('utf-8').decode(buffer);
}

/** 表格文件（xlsx/xls/csv）→ 题目 */
export function questionsFromSheet(buffer: ArrayBuffer, fileName: string): ParseResult {
  let wb: XLSX.WorkBook;
  if (fileName.toLowerCase().endsWith('.csv')) {
    wb = XLSX.read(textFromBuffer(buffer), { type: 'string' });
  } else {
    wb = XLSX.read(buffer, { type: 'array' });
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error('表格中没有工作表');
  const rows: (string | number)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const mapped = mapSheetRows(rows);
  if (mapped) return mapped;

  // 表头无法识别时，把整张表当文本再解析一次
  const text = rows
    .map((r) => r.map((c) => String(c).trim()).filter(Boolean).join(' '))
    .filter(Boolean)
    .join('\n');
  const res = parseQuestions(text);
  if (res.questions.length > 0) return res;

  return {
    questions: [],
    errors: ['未能识别表格结构。请第一行加表头（题干、题型、A、B、C、D、答案、解析），或每行一题写成文本格式'],
  };
}

// 表头别名（单元格去掉空格后精确匹配）
const HEADER_RULES: { key: string; re: RegExp }[] = [
  { key: 'content', re: /^(题干|题目|内容|question|stem)$/i },
  { key: 'type', re: /^(题型|类型|type)$/i },
  { key: 'answer', re: /^(答案|正确答案|参考答案|answer)$/i },
  { key: 'explanation', re: /^(解析|答案解析|说明|explanation)$/i },
  { key: 'A', re: /^(选项a|a选项|a)$/i },
  { key: 'B', re: /^(选项b|b选项|b)$/i },
  { key: 'C', re: /^(选项c|c选项|c)$/i },
  { key: 'D', re: /^(选项d|d选项|d)$/i },
];

function normCell(v: string | number): string {
  return String(v ?? '').replace(/\s+/g, '');
}

/** 按表头映射行数据 → 题目；识别不到表头返回 null */
function mapSheetRows(rows: (string | number)[][]): ParseResult | null {
  let headerIdx = -1;
  let map: Record<string, number> = {};
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const m: Record<string, number> = {};
    rows[i].forEach((cell, ci) => {
      const c = normCell(cell);
      if (!c) return;
      const rule = HEADER_RULES.find((r) => m[r.key] === undefined && r.re.test(c));
      if (rule) m[rule.key] = ci;
    });
    if (m.content !== undefined && m.answer !== undefined) {
      headerIdx = i;
      map = m;
      break;
    }
  }
  if (headerIdx < 0) return null;

  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const content = String(row[map.content] ?? '').trim();
    if (!content) continue;
    const label = `第 ${i - headerIdx} 行`;

    const type: QuestionType = TYPE_MAP[normCell(row[map.type] ?? '')] || 'single';
    const answerRaw = normCell(row[map.answer] ?? '');
    const explanation = String(row[map.explanation] ?? '').trim() || undefined;

    const options: string[] = [];
    const letters: string[] = [];
    if (type !== 'judge') {
      for (const L of ['A', 'B', 'C', 'D']) {
        const ci = map[L];
        if (ci === undefined) break;
        const t = String(row[ci] ?? '').trim();
        if (!t) break;
        letters.push(L);
        options.push(t);
      }
    }

    let answer: string[];
    if (type === 'judge') {
      const s = answerRaw.toUpperCase();
      if (!s) answer = [];
      else if (s === 'A' || s === 'B') answer = [s];
      else if (/正确|√/.test(s) || (s.includes('对') && !s.includes('错'))) answer = ['A'];
      else if (/错误|×/.test(s) || s === 'X' || s.includes('F')) answer = ['B'];
      else answer = [];
    } else {
      answer = [...new Set(answerRaw.toUpperCase().match(/[A-D]/g) || [])];
    }

    if (type !== 'judge' && options.length < 2) {
      errors.push(`${label}：选项不足（A、B 列必填）`);
      continue;
    }
    if (answer.length === 0) {
      errors.push(`${label}：答案无法识别（判断题填 正确/错误，选择题填 A/B/C/D）`);
      continue;
    }
    if (type !== 'judge' && answer.some((a) => !letters.includes(a))) {
      errors.push(`${label}：答案 ${answer.join('')} 超出选项列范围`);
      continue;
    }
    if (type === 'single' && answer.length > 1) {
      errors.push(`${label}：单选题答案只能是一个`);
      continue;
    }
    if (type === 'multi' && answer.length < 2) {
      errors.push(`${label}：多选题答案至少两个`);
      continue;
    }
    if (type === 'judge' && answer.length !== 1) {
      errors.push(`${label}：判断题答案无法识别`);
      continue;
    }

    questions.push({
      type,
      content,
      options: type === 'judge' ? ['正确', '错误'] : options,
      answer,
      explanation,
    });
  }

  if (questions.length === 0 && errors.length === 0) return null;
  return { questions, errors };
}

/** docx → 纯文本（按段落） */
export async function textFromDocx(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file('word/document.xml');
  if (!file) throw new Error('不是有效的 .docx 文档（不支持旧版 .doc）');
  const xml = await file.async('string');
  const out: string[] = [];
  for (const p of xml.split(/<\/w:p>/)) {
    const texts = [...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => decodeXml(m[1]));
    if (texts.length) out.push(texts.join(''));
  }
  return out.join('\n');
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** PDF → 纯文本（微信：上传云存储由云函数 parsePdf 解析；Web：本地 pdf.js 解析） */
export async function textFromPdf(file: PickedFile): Promise<string> {
  if (isWeapp) {
    if (!file.path) throw new Error('缺少文件路径');
    const up = await Taro.cloud.uploadFile({
      cloudPath: `imports/${Date.now()}_${file.name}`,
      filePath: file.path,
    });
    const { text } = await callFunction<{ text: string }>('parsePdf', { fileID: up.fileID });
    return text;
  }
  const { text } = await callFunction<{ text: string }>('parsePdf', {
    base64: bufferToBase64(file.buffer),
    fileName: file.name,
  });
  return text;
}
