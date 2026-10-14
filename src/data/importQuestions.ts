// mock: importQuestions —— 导入自定义题库（新建或追加到我的题库）
import { delay, getDb, MOCK_OPENID, nowIso, uid } from './mock-db';

export default async (data: {
  bankId?: string;
  bankName?: string;
  questions: { type: string; content: string; options: string[]; answer: string[]; explanation?: string }[];
}): Promise<{ bankId: string; count: number }> => {
  await delay(400);
  const db = getDb();
  let bank = data.bankId ? db.banks.find((b) => b._id === data.bankId && b.owner === MOCK_OPENID) : undefined;

  if (data.bankId && !bank) throw new Error('题库不存在');
  if (!bank) {
    const name = (data.bankName || '我的题库').trim() || '我的题库';
    bank = { _id: uid('bank'), type: 'user', owner: MOCK_OPENID, name, createdAt: nowIso() };
    db.banks.push(bank);
  }

  (data.questions || []).forEach((q) => {
    db.questions.push({
      _id: uid('q'),
      bankId: bank!._id,
      type: q.type as any,
      content: q.content,
      options: q.type === 'judge' ? ['正确', '错误'] : q.options,
      answer: q.answer,
      explanation: q.explanation || undefined,
      createdAt: nowIso(),
    });
  });
  return { bankId: bank._id, count: (data.questions || []).length };
};
