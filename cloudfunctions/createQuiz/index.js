const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const bankId = event.bankId || 'bank_official';
    const type = event.type || 'mixed';
    const count = Math.min(Number(event.count) || 10, 50);
    const durationSec = Number(event.durationSec) || 300;

    const cond = { bankId };
    if (type && type !== 'mixed') cond.type = type;
    const totalRes = await db.collection('questions').where(cond).count();
    if (totalRes.total === 0) {
      return { code: -1, message: '该题库暂无此题型题目', data: null };
    }
    const offset = Math.floor(Math.random() * Math.max(1, totalRes.total - count + 1));
    const res = await db.collection('questions').where(cond).skip(offset).limit(count).get();
    const list = res.data;
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }

    const add = await db.collection('quizzes').add({
      data: {
        openid: OPENID,
        bankId,
        type,
        count: list.length,
        durationSec,
        status: 'active',
        questionIds: list.map((q) => q._id),
        createdAt: new Date().toISOString(),
      },
    });
    return { code: 0, message: 'success', data: { quizId: add._id, count: list.length } };
  } catch (err) {
    console.error('createQuiz failed', err);
    return { code: -1, message: err.message || '创建测验失败', data: null };
  }
};
