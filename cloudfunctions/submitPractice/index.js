const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

function fmtDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const items = event.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      return { code: -1, message: '答题记录为空', data: null };
    }
    const mode = event.mode || 'practice';
    const now = new Date().toISOString();
    const today = fmtDate(new Date());
    const recordCol = db.collection('answer_records');
    const wrongCol = db.collection('wrong_questions');

    let correctCount = 0;
    for (const it of items) {
      if (!it.questionId) continue;
      const isCorrect = Boolean(it.isCorrect);
      if (isCorrect) correctCount++;
      await recordCol.add({
        data: {
          openid: OPENID,
          bankId: it.bankId || '',
          type: it.type || '',
          mode,
          questionId: it.questionId,
          userAnswer: (it.userAnswer || []).join(','),
          isCorrect,
          createdAt: now,
        },
      });
      if (!isCorrect) {
        const exist = await wrongCol.where({ openid: OPENID, questionId: it.questionId }).limit(1).get();
        if (exist.data.length > 0) {
          await wrongCol.doc(exist.data[0]._id).update({
            data: { wrongCount: _.inc(1), lastWrongAt: now, mastered: false },
          });
        } else {
          await wrongCol.add({
            data: {
              openid: OPENID,
              questionId: it.questionId,
              bankId: it.bankId || '',
              type: it.type || '',
              wrongCount: 1,
              lastWrongAt: now,
              mastered: false,
              createdAt: now,
            },
          });
        }
      }
    }

    // 更新用户统计 + 打卡
    const userRes = await db.collection('users').where({ openid: OPENID }).limit(1).get();
    if (userRes.data.length > 0) {
      const user = userRes.data[0];
      const update = {
        totalAnswered: _.inc(items.length),
        totalCorrect: _.inc(correctCount),
      };
      if (user.lastCheckin !== today) {
        update.checkinDates = _.addToSet(today);
        update.lastCheckin = today;
      }
      await db.collection('users').doc(user._id).update({ data: update });
    }

    return { code: 0, message: 'success', data: { correctCount, totalCount: items.length } };
  } catch (err) {
    console.error('submitPractice failed', err);
    return { code: -1, message: err.message || '提交失败', data: null };
  }
};
