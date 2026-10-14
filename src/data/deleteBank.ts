// mock: deleteBank —— 删除我的题库（级联删除题目与相关错题）
import { commit, delay, getDb, MOCK_OPENID } from './mock-db';

export default async (data: { bankId: string }): Promise<{ ok: boolean }> => {
  await delay(250);
  const db = getDb();
  const idx = db.banks.findIndex((b) => b._id === data.bankId && b.owner === MOCK_OPENID);
  if (idx === -1) throw new Error('题库不存在或无权删除');
  db.banks.splice(idx, 1);
  db.questions = db.questions.filter((q) => q.bankId !== data.bankId);
  db.wrong = db.wrong.filter((w) => w.bankId !== data.bankId);
  commit();
  return { ok: true };
};
