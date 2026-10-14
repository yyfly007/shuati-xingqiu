const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const limit = Math.min(Number(event.limit) || 100, 200);
    const cond = { openid: OPENID, mastered: false };
    if (event.type && event.type !== 'all' && event.type !== 'mixed') cond.type = event.type;

    const countRes = await db.collection('wrong_questions').where(cond).count();
    const res = await db
      .collection('wrong_questions')
      .where(cond)
      .orderBy('lastWrongAt', 'desc')
      .limit(limit)
      .get();

    const ids = res.data.map((w) => w.questionId);
    const qRes = ids.length > 0 ? await db.collection('questions').where({ _id: _.in(ids) }).get() : { data: [] };
    const qMap = {};
    qRes.data.forEach((q) => {
      qMap[q._id] = q;
    });

    const list = res.data
      .map((w) => {
        const q = qMap[w.questionId];
        if (!q) return null;
        const { openid, ...rest } = w;
        return { ...rest, question: q };
      })
      .filter(Boolean);

    return { code: 0, message: 'success', data: { total: countRes.total, list } };
  } catch (err) {
    console.error('getWrongQuestions failed', err);
    return { code: -1, message: err.message || '获取错题失败', data: null };
  }
};
