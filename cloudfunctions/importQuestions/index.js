const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const questions = event.questions || [];
    if (!Array.isArray(questions) || questions.length === 0) {
      return { code: -1, message: '题目列表为空', data: null };
    }
    const now = new Date().toISOString();
    const bankCol = db.collection('question_banks');

    let bank;
    if (event.bankId) {
      const res = await bankCol.doc(event.bankId).get();
      if (!res.data || res.data.openid !== OPENID) {
        return { code: -1, message: '题库不存在或无权操作', data: null };
      }
      bank = res.data;
    } else {
      const name = (event.bankName || '我的题库').toString().trim() || '我的题库';
      const add = await bankCol.add({
        data: { type: 'user', openid: OPENID, name, createdAt: now },
      });
      bank = { _id: add._id };
    }

    const qCol = db.collection('questions');
    for (const q of questions) {
      const type = ['single', 'multi', 'judge'].includes(q.type) ? q.type : 'single';
      await qCol.add({
        data: {
          bankId: bank._id,
          type,
          content: String(q.content || ''),
          options: type === 'judge' ? ['正确', '错误'] : q.options || [],
          answer: q.answer || [],
          explanation: q.explanation || '',
          createdAt: now,
        },
      });
    }
    return { code: 0, message: 'success', data: { bankId: bank._id, count: questions.length } };
  } catch (err) {
    console.error('importQuestions failed', err);
    return { code: -1, message: err.message || '导入失败', data: null };
  }
};
