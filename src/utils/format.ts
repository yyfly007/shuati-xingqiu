import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { PracticeType, QuestionType } from '../types';

dayjs.locale('zh-cn');

export const LETTERS = ['A', 'B', 'C', 'D'];

export const TYPE_LABEL: Record<PracticeType, string> = {
  single: '单选题',
  multi: '多选题',
  judge: '判断题',
  mixed: '混合题',
};

export const TYPE_SHORT: Record<PracticeType, string> = {
  single: '单选',
  multi: '多选',
  judge: '判断',
  mixed: '混合',
};

/** 判断两个选项集合是否相等（顺序无关） */
export function sameAnswer(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort().join('');
  const sb = [...b].sort().join('');
  return sa === sb;
}

/** 正确率 0-100 */
export function accuracyRate(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

/** 秒数 → 'm分s秒' / 'mm:ss' */
export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function formatDateTime(input: string | number | Date): string {
  return dayjs(input).format('YYYY-MM-DD HH:mm');
}

export function formatDate(input: string | number | Date): string {
  return dayjs(input).format('YYYY-MM-DD');
}

export function todayStr(): string {
  return dayjs().format('YYYY-MM-DD');
}

/** 按正确率给出鼓励语 */
export function encouragement(rate: number): string {
  if (rate >= 90) return '太棒了，继续保持！';
  if (rate >= 75) return '不错哦，再努把力就满分！';
  if (rate >= 60) return '及格线之上，继续加油！';
  return '没关系，错题正是进步的起点！';
}

export function greetingByHour(): string {
  const h = dayjs().hour();
  if (h < 6) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

export function isQuestionType(t: string): t is QuestionType {
  return t === 'single' || t === 'multi' || t === 'judge';
}
