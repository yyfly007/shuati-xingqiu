// mock: updateWrongQuestion —— 标记已掌握 / 删除错题
import { commit, delay, getDb } from './mock-db';

export default async (data: { wrongId: string; action: 'mastered' | 'delete' }): Promise<{ ok: boolean }> => {
  await delay(200);
  const db = getDb();
  const idx = db.wrong.findIndex((w) => w._id === data.wrongId);
  if (idx === -1) throw new Error('错题不存在');
  if (data.action === 'mastered') {
    db.wrong[idx].mastered = true;
  } else {
    db.wrong.splice(idx, 1);
  }
  commit();
  return { ok: true };
};
