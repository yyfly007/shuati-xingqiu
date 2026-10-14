// Web 预览共享内存数据库（localStorage 持久化）
// 模拟云开发的集合：users / question_banks / questions / answer_records / wrong_questions / quizzes
import dayjs from 'dayjs';
import { Question, QuestionBank, Quiz, User, WrongQuestion } from '../types';

export interface AnswerRecord {
  _id: string;
  openid: string;
  bankId: string;
  type: string;
  mode: 'practice' | 'quiz';
  questionId: string;
  userAnswer: string; // 'A' 或 'A,C'
  isCorrect: boolean;
  createdAt: string;
}

export interface WrongDoc extends WrongQuestion {
  mastered: boolean;
  createdAt: string;
}

export interface BankDoc {
  _id: string;
  type: 'official' | 'user';
  owner: string; // 'official' 或 openid
  name: string;
  createdAt: string;
}

export interface DB {
  user: User;
  banks: BankDoc[];
  questions: Question[];
  records: AnswerRecord[];
  wrong: WrongDoc[];
  quizzes: Quiz[];
}

export const MOCK_OPENID = 'mock_openid_0001';
const STORAGE_KEY = 'sbx_mock_db_v1';

// ---------------- 种子题目（官方综合题库） ----------------
const SEED_QUESTIONS: Omit<Question, 'bankId'>[] = [
  // 单选 10 题
  { _id: 'q_s1', type: 'single', content: '太阳系中体积最大的行星是？', options: ['水星', '地球', '木星', '土星'], answer: ['C'], explanation: '木星是太阳系最大的行星，体积约为其他行星总和的 2.5 倍。' },
  { _id: 'q_s2', type: 'single', content: '125 × 8 = ?', options: ['1000', '1008', '998', '10000'], answer: ['A'], explanation: '125 × 8 = 1000，常用速算组合。' },
  { _id: 'q_s3', type: 'single', content: '已知 A + B = C，若 A = 15，B = 27，则 C = ?', options: ['40', '42', '44', '46'], answer: ['B'], explanation: '15 + 27 = 42。' },
  { _id: 'q_s4', type: 'single', content: '下列哪种动物属于哺乳动物？', options: ['鲨鱼', '鲸鱼', '鳄鱼', '章鱼'], answer: ['B'], explanation: '鲸鱼用肺呼吸、胎生哺乳，是哺乳动物。' },
  { _id: 'q_s5', type: 'single', content: '1 小时等于多少分钟？', options: ['100', '60', '36', '120'], answer: ['B'], explanation: '1 小时 = 60 分钟。' },
  { _id: 'q_s6', type: 'single', content: '下列分数中最小的是？', options: ['1/4', '1/2', '1/8', '1/3'], answer: ['C'], explanation: '分子相同，分母越大分数越小。' },
  { _id: 'q_s7', type: 'single', content: '三角形内角和是多少度？', options: ['90°', '180°', '270°', '360°'], answer: ['B'], explanation: '任意三角形内角和恒为 180°。' },
  { _id: 'q_s8', type: 'single', content: '下列哪个数是质数？', options: ['9', '15', '17', '21'], answer: ['C'], explanation: '17 只能被 1 和自身整除；9、15、21 都是合数。' },
  { _id: 'q_s9', type: 'single', content: '把 0.6、0.16、0.06、0.61 从小到大排列，正确的是？', options: ['0.06 < 0.16 < 0.6 < 0.61', '0.06 < 0.6 < 0.16 < 0.61', '0.16 < 0.06 < 0.61 < 0.6', '0.6 < 0.16 < 0.06 < 0.61'], answer: ['A'], explanation: '逐位比较小数大小。' },
  { _id: 'q_s10', type: 'single', content: '200 的 50% 是多少？', options: ['50', '100', '150', '200'], answer: ['B'], explanation: '200 × 50% = 100。' },
  // 多选 6 题
  { _id: 'q_m1', type: 'multi', content: '下列哪些数是偶数？', options: ['12', '15', '24', '38'], answer: ['A', 'C', 'D'], explanation: '能被 2 整除的数是偶数，15 是奇数。' },
  { _id: 'q_m2', type: 'multi', content: '下列哪些数是 3 的倍数？', options: ['9', '14', '21', '25'], answer: ['A', 'C'], explanation: '各位数字之和是 3 的倍数，则是 3 的倍数。' },
  { _id: 'q_m3', type: 'multi', content: '下列哪些数是质数？', options: ['2', '4', '7', '13'], answer: ['A', 'C', 'D'], explanation: '4 = 2 × 2 是合数；2 是最小的质数。' },
  { _id: 'q_m4', type: 'multi', content: '下列哪些动物是卵生？', options: ['鸡', '狗', '鸭', '蛇'], answer: ['A', 'C', 'D'], explanation: '狗是胎生哺乳动物。' },
  { _id: 'q_m5', type: 'multi', content: '下列哪些是长度单位？', options: ['米', '千克', '厘米', '升'], answer: ['A', 'C'], explanation: '千克是质量单位，升是容积单位。' },
  { _id: 'q_m6', type: 'multi', content: '下列哪些数是完全平方数？', options: ['16', '18', '25', '49'], answer: ['A', 'C', 'D'], explanation: '16=4²、25=5²、49=7²；18 不是。' },
  // 判断 8 题
  { _id: 'q_j1', type: 'judge', content: '所有的质数都是奇数。', options: ['正确', '错误'], answer: ['B'], explanation: '2 是质数，也是唯一的偶质数。' },
  { _id: 'q_j2', type: 'judge', content: '0.5 等于 50%。', options: ['正确', '错误'], answer: ['A'], explanation: '0.5 × 100% = 50%。' },
  { _id: 'q_j3', type: 'judge', content: '任何三角形都是轴对称图形。', options: ['正确', '错误'], answer: ['B'], explanation: '只有等腰、等边三角形才是轴对称图形。' },
  { _id: 'q_j4', type: 'judge', content: '一个数（0 除外）乘以 0 都等于 0。', options: ['正确', '错误'], answer: ['A'], explanation: '0 乘任何数都得 0。' },
  { _id: 'q_j5', type: 'judge', content: '1 是质数。', options: ['正确', '错误'], answer: ['B'], explanation: '1 既不是质数也不是合数。' },
  { _id: 'q_j6', type: 'judge', content: '平年一年有 365 天。', options: ['正确', '错误'], answer: ['A'], explanation: '平年 365 天，闰年 366 天。' },
  { _id: 'q_j7', type: 'judge', content: '所有正方形都是长方形。', options: ['正确', '错误'], answer: ['A'], explanation: '正方形是特殊的长方形（四边相等）。' },
  { _id: 'q_j8', type: 'judge', content: '半圆只有一条对称轴。', options: ['正确', '错误'], answer: ['A'], explanation: '半圆的对称轴是垂直平分其直径的直线，仅一条。' },
];

// ---------------- 初始数据库 ----------------
function seed(): DB {
  const nowIso = new Date().toISOString();
  return {
    user: {
      _id: 'user_mock',
      nickname: '刷题同学',
      avatarUrl: '',
      createdAt: nowIso,
      totalAnswered: 0,
      totalCorrect: 0,
      quizCount: 0,
      checkinDates: [],
      lastCheckin: '',
    },
    banks: [
      { _id: 'bank_official', type: 'official', owner: 'official', name: '官方综合题库', createdAt: nowIso },
    ],
    questions: SEED_QUESTIONS.map((q) => ({ ...q, bankId: 'bank_official', createdAt: nowIso })),
    records: [],
    wrong: [],
    quizzes: [],
  };
}

function load(): DB {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const db = JSON.parse(raw) as DB;
        // 简单校验结构
        if (db && db.user && Array.isArray(db.questions)) return db;
      }
    }
  } catch (e) {
    console.warn('[mock-db] load failed, reseed', e);
  }
  return seed();
}

function save(db: DB) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    }
  } catch (e) {
    console.warn('[mock-db] save failed', e);
  }
}

let db: DB | null = null;
export function getDb(): DB {
  if (!db) {
    db = load();
  }
  return db;
}

/** 重置演示数据 */
export function resetDb() {
  db = seed();
  save(db);
}

export function commit() {
  save(getDb());
}

// ---------------- 通用工具 ----------------
export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function delay(ms = 250): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 洗牌取前 n 个 */
export function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

/** 按银行 + 题型筛选题目 */
export function filterQuestions(bankId: string | undefined, type: string | undefined): Question[] {
  const d = getDb();
  let list = d.questions.filter((q) => q.bankId === (bankId || 'bank_official'));
  if (type && type !== 'mixed') list = list.filter((q) => q.type === type);
  return list;
}

/** 连续打卡天数（今天未打卡则从昨天往前数） */
export function calcStreak(dates: string[]): number {
  const set = new Set(dates);
  let d = dayjs();
  if (!set.has(d.format('YYYY-MM-DD'))) d = d.subtract(1, 'day');
  let streak = 0;
  while (set.has(d.format('YYYY-MM-DD'))) {
    streak++;
    d = d.subtract(1, 'day');
  }
  return streak;
}

/** 记录答题结果：流水 + 用户统计 + 打卡 + 错题 upsert */
export function applyAnswerResults(
  items: { questionId: string; bankId: string; type: string; userAnswer: string[]; isCorrect: boolean }[],
  mode: 'practice' | 'quiz'
): { correctCount: number; totalCount: number } {
  const d = getDb();
  const today = dayjs().format('YYYY-MM-DD');
  let correctCount = 0;

  items.forEach((it) => {
    if (it.isCorrect) correctCount++;
    d.records.push({
      _id: uid('r'),
      openid: MOCK_OPENID,
      bankId: it.bankId,
      type: it.type,
      mode,
      questionId: it.questionId,
      userAnswer: it.userAnswer.join(','),
      isCorrect: it.isCorrect,
      createdAt: nowIso(),
    });
    // 错题 upsert
    if (!it.isCorrect) {
      const w = d.wrong.find((x) => x.questionId === it.questionId);
      if (w) {
        w.wrongCount++;
        w.lastWrongAt = nowIso();
        w.mastered = false;
      } else {
        d.wrong.push({
          _id: uid('w'),
          questionId: it.questionId,
          bankId: it.bankId,
          type: it.type,
          wrongCount: 1,
          lastWrongAt: nowIso(),
          mastered: false,
          createdAt: nowIso(),
        });
      }
    }
  });

  d.user.totalAnswered += items.length;
  d.user.totalCorrect += correctCount;
  if (d.user.lastCheckin !== today) {
    d.user.checkinDates.push(today);
    d.user.lastCheckin = today;
  }
  commit();
  return { correctCount, totalCount: items.length };
}

/** 计算题库的题量统计 */
export function bankStats(bankId: string): { questionCount: number; typeStats: Record<'single' | 'multi' | 'judge', number> } {
  const d = getDb();
  const list = d.questions.filter((q) => q.bankId === bankId);
  return {
    questionCount: list.length,
    typeStats: {
      single: list.filter((q) => q.type === 'single').length,
      multi: list.filter((q) => q.type === 'multi').length,
      judge: list.filter((q) => q.type === 'judge').length,
    },
  };
}

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}
