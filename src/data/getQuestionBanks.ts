// mock: getQuestionBanks —— 官方题库 + 我的题库（含题量统计）
import { QuestionBank } from '../types';
import { bankStats, clone, delay, getDb, MOCK_OPENID } from './mock-db';

export default async (): Promise<QuestionBank[]> => {
  await delay(200);
  const db = getDb();
  const list = db.banks.filter((b) => b.type === 'official' || b.owner === MOCK_OPENID);
  return clone(
    list.map((b) => ({
      _id: b._id,
      type: b.type,
      name: b.name,
      createdAt: b.createdAt,
      ...bankStats(b._id),
    }))
  );
};
