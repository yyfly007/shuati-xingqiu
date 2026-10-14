// mock: createQuiz —— 生成限时测验卷
import { PracticeType } from '../types';
import { filterQuestions, getDb, nowIso, pickRandom, uid, delay } from './mock-db';

export default async (data: {
  bankId?: string;
  type?: PracticeType;
  count?: number;
  durationSec?: number;
}): Promise<{ quizId: string; count: number }> => {
  await delay(300);
  const db = getDb();
  const count = data?.count || 10;
  const list = filterQuestions(data?.bankId, data?.type);
  const picked = pickRandom(list, count);

  const quizId = uid('quiz');
  db.quizzes.push({
    _id: quizId,
    bankId: data?.bankId || 'bank_official',
    type: data?.type || 'mixed',
    count: picked.length,
    durationSec: data?.durationSec || 300,
    status: 'active',
    questionIds: picked.map((q) => q._id),
    createdAt: nowIso(),
  });
  return { quizId, count: picked.length };
};
