import { QuestionType } from '../types';
import { LETTERS } from './format';

export interface ParsedQuestion {
  type: QuestionType;
  content: string;
  options: string[];
  answer: string[];
  explanation?: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: string[];
}

export const TYPE_MAP: Record<string, QuestionType> = {
  '单选': 'single',
  '单选题': 'single',
  '多选': 'multi',
  '多选题': 'multi',
  '判断': 'judge',
  '判断题': 'judge',
};

// 序号开头：1. / 1、 / 1) / 第1题（排除 1.5 这类小数）
const NUM_HEAD = /^(?:(?:第\s*\d{1,3}\s*题)\s*[、.．:：]?\s*|\d{1,3}\s*(?:[、)）]|[.．](?!\d)|[::])\s*)/;
// 大标题：一、单选题 / 二．判断题 / 三 选择题
const SECTION_HEAD = /^[一二三四五六七八九十]+\s*[、.．:：]?\s*(单选题|选择题|判断题|多选题)/;
// 内联题型标记：(单选) / （多选） / [判断] / 【判断题】
const INLINE_TYPE = /[（(【\[]\s*(单选题|多选题|判断题|选择题|单选|多选|判断)\s*[)）\]】]/;
// 选项标记（同行，需带分隔符）：A. / A、 / A． / A: / A)
const OPT_MARK = /(?<![A-Za-z0-9（(【\[])([A-D])\s*[.、．:：)）\]】]\s*/g;
// 选项标记（行首，分隔符可选）
const OPT_LINE = /^([A-D])\s*[.、．:：)）\]】]?\s*\S/;
// 答案行：答案：C / 【答案】AB / 参考答案: A,C
const ANSWER_MARK = /(?:【答案】|参考答案\s*[::]?\s*|正确答案\s*[::]?\s*|答案\s*[::]\s*)([^\n]{1,24})/;
// 解析：解析：... / 【解析】...
const EXPLAIN_MARK = /(?:【解析】|答案解析\s*[::]?\s*|解析\s*[::]\s*)/;

/**
 * 解析批量导入文本，兼容两种格式：
 * ① 规范格式（空行分题）：
 *    [单选] 题目内容
 *    A. 选项一
 *    答案：A
 * ② 常见格式（序号开头，选项可同行可换行，自动识别题型）：
 *    1. 题目 A. 选项1 B. 选项2 答案：C
 */
export function parseQuestions(text: string): ParseResult {
  const lines = (text || '').split(/\r?\n/);
  interface Block {
    lines: string[];
    section: QuestionType | null;
  }
  const blocks: Block[] = [];
  let section: QuestionType | null = null;
  let current: Block | null = null;

  const flush = () => {
    if (current) {
      blocks.push(current);
      current = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    // 分隔注释行（如 —— 选择题部分 ——）
    if (/^—{2,}.*—{2,}$/.test(line)) {
      flush();
      continue;
    }
    const sec = line.match(SECTION_HEAD);
    if (sec) {
      flush();
      section = sec[1] === '判断题' ? 'judge' : sec[1] === '多选题' ? 'multi' : null;
      continue;
    }
    const isStrict = /^\[(.+?)\]\s*\S/.test(line);
    const isNum = NUM_HEAD.test(line);
    if (isStrict || isNum) {
      flush();
      current = { lines: [line], section };
      continue;
    }
    if (current) current.lines.push(line);
    else blocks.push({ lines: [line], section });
  }
  flush();

  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];
  blocks.forEach((block, idx) => {
    const label = `第 ${idx + 1} 题`;
    if (/^\[.+\]/.test(block.lines[0])) {
      parseStrictBlock(block.lines, label, questions, errors);
    } else {
      parseLooseBlock(block.lines, label, block.section, questions, errors);
    }
  });

  return { questions, errors };
}

/** ① 规范格式块解析 */
function parseStrictBlock(
  lines: string[],
  label: string,
  questions: ParsedQuestion[],
  errors: string[]
) {
  const headMatch = lines[0].match(/^\[(.+?)\]\s*(.+)$/);
  if (!headMatch) {
    errors.push(`${label}：首行需为 [题型] 题目内容`);
    return;
  }
  const type = TYPE_MAP[headMatch[1].trim()];
  if (!type) {
    errors.push(`${label}：题型「${headMatch[1].trim()}」无法识别，支持 单选/多选/判断`);
    return;
  }
  const content = headMatch[2].trim();
  if (!content) {
    errors.push(`${label}：题目内容不能为空`);
    return;
  }

  const options: string[] = [];
  const optionLetters: string[] = [];
  let answerStr = '';
  let explanation = '';

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const optMatch = line.match(/^([ABCD])\s*[.、．:：]\s*(.+)$/);
    const ansMatch = line.match(/^答案\s*[::]\s*([ABCD,，\s]+)$/);
    const expMatch = line.match(/^解析\s*[::]\s*(.+)$/);
    if (optMatch) {
      optionLetters.push(optMatch[1]);
      options.push(optMatch[2].trim());
    } else if (ansMatch) {
      answerStr = ansMatch[1].replace(/，/g, ',');
    } else if (expMatch) {
      explanation = expMatch[1].trim();
    }
  }

  if (type === 'judge') {
    const ans = answerStr.replace(/,/g, '').trim();
    if (!ans || !['A', 'B'].includes(ans)) {
      errors.push(`${label}：判断题答案需为 A 或 B`);
      return;
    }
    questions.push({ type, content, options: ['正确', '错误'], answer: [ans], explanation: explanation || undefined });
    return;
  }

  if (options.length < 2) {
    errors.push(`${label}：至少需要 A、B 两个选项`);
    return;
  }
  const answer = [...new Set(answerStr.split(/[,\s]+/).filter(Boolean))];
  if (answer.length === 0) {
    errors.push(`${label}：缺少「答案：X」行`);
    return;
  }
  const validLetters = new Set(optionLetters);
  if (answer.some((a) => !validLetters.has(a))) {
    errors.push(`${label}：答案字母 ${answer.join('')} 超出选项范围`);
    return;
  }
  if (type === 'single' && answer.length !== 1) {
    errors.push(`${label}：单选题答案只能是一个选项`);
    return;
  }
  if (type === 'multi' && answer.length < 2) {
    errors.push(`${label}：多选题答案至少需要两个选项`);
    return;
  }

  questions.push({ type, content, options, answer: answer.sort(), explanation: explanation || undefined });
}

/** ② 常见格式块解析（序号题，自动识别题型/选项/答案） */
function parseLooseBlock(
  lines: string[],
  label: string,
  section: QuestionType | null,
  questions: ParsedQuestion[],
  errors: string[]
) {
  const full = lines.join('\n');

  // 答案
  let answerText = '';
  let ansPos = -1;
  const ansM = full.match(ANSWER_MARK);
  if (ansM) {
    answerText = ansM[1];
    ansPos = ansM.index as number;
  }

  // 解析
  let explanation = '';
  let expPos = -1;
  const expM = full.match(EXPLAIN_MARK);
  if (expM) {
    expPos = expM.index as number;
    explanation = full.slice(expPos + expM[0].length).trim();
  }

  // 题干区域：答案/解析之前
  let body = full;
  const cut = Math.min(ansPos >= 0 ? ansPos : Infinity, expPos >= 0 ? expPos : Infinity);
  if (cut !== Infinity) body = full.slice(0, cut);

  // 内联题型
  let type: QuestionType | null = section;
  const inlineM = body.match(INLINE_TYPE);
  if (inlineM) {
    const t = TYPE_MAP[inlineM[1]];
    if (t) type = t;
    body = body.replace(INLINE_TYPE, '');
  }

  // 去掉序号
  body = body.replace(NUM_HEAD, '');

  // 选项：优先同行标记（A. B. C. D. 连续），否则按行首标记
  let optLetters: string[] = [];
  let optTexts: string[] = [];
  let content = body;

  OPT_MARK.lastIndex = 0;
  const marks: { letter: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = OPT_MARK.exec(body))) {
    marks.push({ letter: m[1], start: m.index, end: m.index + m[0].length });
  }
  const seq: typeof marks = [];
  for (const mk of marks) {
    if (mk.letter === String.fromCharCode(65 + seq.length)) seq.push(mk);
    if (seq.length === 4) break;
  }

  if (seq.length >= 2) {
    seq.forEach((mk, i) => {
      const endPos = i + 1 < seq.length ? seq[i + 1].start : body.length;
      optLetters.push(mk.letter);
      optTexts.push(body.slice(mk.end, endPos).replace(/\s*\n\s*/g, ' ').trim());
    });
    content = body.slice(0, seq[0].start);
  } else {
    // 行首模式
    const bodyLines = body.split('\n').map((l) => l.trim()).filter(Boolean);
    const firstOptLine = bodyLines.findIndex((l) => OPT_LINE.test(l));
    if (firstOptLine >= 0) {
      content = bodyLines.slice(0, firstOptLine).join(' ');
      for (let i = firstOptLine; i < bodyLines.length && optLetters.length < 4; i++) {
        const lm = bodyLines[i].match(OPT_LINE);
        if (lm && lm[1] === String.fromCharCode(65 + optLetters.length)) {
          optLetters.push(lm[1]);
          optTexts.push(bodyLines[i].slice(lm[0].length).trim());
        }
      }
    } else {
      content = body;
    }
  }

  content = content.replace(/\s*\n\s*/g, ' ').trim();
  // 去掉首尾多余括号/冒号
  content = content.replace(/^[：:、.．\s]+/, '').trim();

  const hasOptions = optLetters.length >= 2;
  if (!type) type = hasOptions ? 'single' : 'judge';

  // 规范化答案
  const ansUpper = answerText.replace(/，/g, ',').toUpperCase();
  let answer: string[];
  if (type === 'judge') {
    const t = ansUpper.trim();
    if (t === 'A' || t === 'B') answer = [t];
    else if (/正确|√/.test(t) || (t.includes('对') && !t.includes('错'))) answer = ['A'];
    else if (/错误|×/.test(t) || t === 'X' || t.includes('F')) answer = ['B'];
    else answer = [];
  } else {
    answer = [...new Set(ansUpper.match(/[A-D]/g) || [])];
  }

  if (!content) {
    errors.push(`${label}：题目内容为空`);
    return;
  }
  if (!hasOptions) {
    // 判断题
    if (answer.length !== 1) {
      errors.push(`${label}：未识别到答案（判断题答案如：正确 / 错误 / A / B）`);
      return;
    }
    if (!explanation) explanation = '';
    questions.push({ type: 'judge', content, options: ['正确', '错误'], answer, explanation: explanation || undefined });
    return;
  }

  // 单选/多选
  const pairs = optTexts.map((t, i) => ({ letter: optLetters[i], text: t })).filter((x) => x.text);
  if (pairs.length < 2) {
    errors.push(`${label}：选项识别不足（需至少 A、B 两个选项）`);
    return;
  }
  if (answer.length === 0) {
    errors.push(`${label}：未识别到答案`);
    return;
  }
  optLetters = pairs.map((p) => p.letter);
  optTexts = pairs.map((p) => p.text);
  if (answer.some((a) => !optLetters.includes(a))) {
    errors.push(`${label}：答案 ${answer.join('')} 超出选项范围`);
    return;
  }
  // 根据答案个数纠正题型
  if (type === 'single' && answer.length > 1) type = 'multi';
  if (type === 'multi' && answer.length === 1) type = 'single';
  if (type === 'single' && answer.length !== 1) {
    errors.push(`${label}：单选题答案只能是一个选项`);
    return;
  }
  if (type === 'multi' && answer.length < 2) {
    errors.push(`${label}：多选题答案至少两个`);
    return;
  }

  questions.push({ type, content, options: optTexts, answer: answer.sort(), explanation: explanation || undefined });
}

/** 将 ParsedQuestion 转为导入接口结构 */
export function toImportQuestion(q: ParsedQuestion) {
  return {
    type: q.type,
    content: q.content,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation || '',
  };
}

/** 生成示例导入文本 */
export function exampleImportText(): string {
  return [
    '[单选] 太阳系中最大的行星是？',
    'A. 地球',
    'B. 火星',
    'C. 木星',
    'D. 土星',
    '答案：C',
    '解析：木星体积约为其他行星总和的 2.5 倍。',
    '',
    '[多选] 下列哪些是质数？',
    'A. 2',
    'B. 4',
    'C. 7',
    'D. 13',
    '答案：A,C,D',
    '',
    '[判断] 所有的偶数都是合数。',
    '答案：B',
    '解析：2 是偶数但也是质数。',
    '',
    '—— 也支持常见格式 ——',
    '1. 地球围绕什么公转？ A. 太阳 B. 月亮 C. 火星 D. 金星 答案：A',
    '2. 下列属于可再生能源的是（多选） A. 太阳能 B. 煤炭 C. 风能 D. 石油 答案：A,C',
    '3. 水在标准大气压下 100 摄氏度沸腾。 答案：正确',
  ].join('\n');
}

export { LETTERS };
