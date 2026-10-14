const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const res = await db.collection('question_banks').doc(event.bankId).get();
    if (!res.data || res.data.type !== 'user' || res.data.openid !== OPENID) {
      return { code: -1, message: '题库不存在或无权删除', data: null };
    }
    // 级联删除题目与错题（单次最多 100 条，循环删完）
    let removed;
    do {
      const r = await db.collection('questions').where({ bankId: event.bankId }).remove();
      removed = (r.stats && r.stats.removed) || 0;
    } while (removed > 0);
    do {
      const r = await db.collection('wrong_questions').where({ openid: OPENID, bankId: event.bankId }).remove();
      removed = (r.stats && r.stats.removed) || 0;
    } while (removed > 0);
    await db.collection('question_banks').doc(event.bankId).remove();
    return { code: 0, message: 'success', data: { ok: true } };
  } catch (err) {
    console.error('deleteBank failed', err);
    return { code: -1, message: err.message || '删除失败', data: null };
  }
};
