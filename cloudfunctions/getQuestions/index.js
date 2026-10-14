const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

async function fetchQuestionsByIds(ids) {
  if (ids.length === 0) return [];
  const res = await db.collection('questions').where({ _id: _.in(ids) }).get();
  return res.data;
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const bankId = event.bankId || 'bank_official';
    const type = event.type || 'mixed';
    const count = Math.min(Number(event.count) || 10, 50);
    const mode = event.mode || 'practice';

    if (mode === 'wrong') {
      const cond = { openid: OPENID, mastered: false };
      if (type && type !== 'mixed' && type !== 'all') cond.type = type;
      const res = await db
        .collection('wrong_questions')
        .where(cond)
        .orderBy('lastWrongAt', 'desc')
        .limit(count)
        .get();
      const ids = res.data.map((w) => w.questionId);
      const questions = await fetchQuestionsByIds(ids);
      // 保持错题最近顺序
      const map = {};
      questions.forEach((q) => {
        map[q._id] = q;
      });
      return {
        code: 0,
        message: 'success',
        data: ids.map((id) => map[id]).filter(Boolean),
      };
    }

    // 练习 / 测验取题：随机 skip
    const cond = { bankId };
    if (type && type !== 'mixed') cond.type = type;
    const totalRes = await db.collection('questions').where(cond).count();
    const total = totalRes.total;
    if (total === 0) {
      return { code: 0, message: 'success', data: [] };
    }
    const offset = Math.floor(Math.random() * Math.max(1, total - count + 1));
    const res = await db.collection('questions').where(cond).skip(offset).limit(count).get();
    // 打乱顺序
    const list = res.data;
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return { code: 0, message: 'success', data: list };
  } catch (err) {
    console.error('getQuestions failed', err);
    return { code: -1, message: err.message || '获取题目失败', data: null };
  }
};
