// 题目类型：单选 / 多选 / 判断
export type QuestionType = 'single' | 'multi' | 'judge';
// 题型（含混合，用于练习/测验配置）
export type PracticeType = QuestionType | 'mixed';

export interface Question {
  _id: string;
  bankId: string;
  type: QuestionType;
  content: string;
  options: string[]; // 选项文本（判断题固定为 ['正确', '错误']）
  answer: string[]; // 正确选项字母，如 ['A'] / ['A','C'] / ['A']
  explanation?: string;
  createdAt?: string;
}

export interface QuestionBank {
  _id: string;
  type: 'official' | 'user';
  name: string;
  questionCount: number;
  typeStats: Record<QuestionType, number>;
  createdAt?: string;
}

export interface User {
  _id: string;
  nickname: string;
  avatarUrl: string;
  createdAt: string;
  totalAnswered: number;
  totalCorrect: number;
  quizCount: number;
  checkinDates: string[]; // 'YYYY-MM-DD'
  lastCheckin?: string;
}

export interface Quiz {
  _id: string;
  bankId: string;
  type: PracticeType;
  count: number;
  durationSec: number;
  status: 'active' | 'submitted';
  questionIds: string[];
  answers?: Record<string, string[]>;
  correctCount?: number;
  timeUsedSec?: number;
  createdAt: string;
  submittedAt?: string;
}

export interface WrongQuestion {
  _id: string;
  questionId: string;
  bankId: string;
  type: QuestionType;
  wrongCount: number;
  lastWrongAt: string;
  question?: Question;
}

export interface StatsData {
  user: User;
  today: { answered: number; correct: number };
  week: { date: string; answered: number; correct: number }[];
  streak: number;
  monthCheckins: number;
  accuracy: number; // 0-100
}
