const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const doc = db.collection('wrong_questions').doc(event.wrongId);
    const res = await doc.get();
    if (!res.data || res.data.openid !== OPENID) {
      return { code: -1, message: '错题不存在', data: null };
    }
    if (event.action === 'mastered') {
      await doc.update({ data: { mastered: true } });
    } else if (event.action === 'delete') {
      await doc.remove();
    } else {
      return { code: -1, message: '未知操作', data: null };
    }
    return { code: 0, message: 'success', data: { ok: true } };
  } catch (err) {
    console.error('updateWrongQuestion failed', err);
    return { code: -1, message: err.message || '操作失败', data: null };
  }
};
