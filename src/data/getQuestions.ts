// mock: getQuestions —— 练习取题 / 错题重练
import { Question } from '../types';
import { clone, delay, filterQuestions, getDb, pickRandom } from './mock-db';

export default async (data: {
  bankId?: string;
  type?: string;
  count?: number;
  mode?: 'practice' | 'wrong';
}): Promise<Question[]> => {
  await delay(300);
  const db = getDb();
  const mode = data?.mode || 'practice';

  if (mode === 'wrong') {
    const pending = db.wrong
      .filter((w) => !w.mastered)
      .sort((a, b) => (a.lastWrongAt < b.lastWrongAt ? 1 : -1));
    const ids = pending
      .slice(0, data?.count || 50)
      .map((w) => w.questionId)
      .filter(Boolean);
    return clone(db.questions.filter((q) => ids.includes(q._id)));
  }

  const count = data?.count || 10;
  const list = filterQuestions(data?.bankId, data?.type);
  return clone(pickRandom(list, count));
};
