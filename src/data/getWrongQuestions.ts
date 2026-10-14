// mock: getWrongQuestions —— 我的错题（含题目内容）
import { WrongQuestion } from '../types';
import { clone, delay, getDb } from './mock-db';

export default async (data?: { type?: string; limit?: number }): Promise<{ total: number; list: WrongQuestion[] }> => {
  await delay(250);
  const db = getDb();
  let list = db.wrong.filter((w) => !w.mastered);
  if (data?.type && data.type !== 'all') list = list.filter((w) => w.type === data.type);
  list = list.sort((a, b) => (a.lastWrongAt < b.lastWrongAt ? 1 : -1));
  const total = list.length;
  const limit = data?.limit || 100;
  list = list.slice(0, limit);
  const joined = list
    .map((w) => {
      const q = db.questions.find((x) => x._id === w.questionId);
      return { ...w, question: q ? clone(q) : undefined };
    })
    .filter((w) => Boolean(w.question));
  return { total, list: joined as WrongQuestion[] };
};
