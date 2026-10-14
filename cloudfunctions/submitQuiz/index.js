const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

function fmtDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function sameAnswer(a, b) {
  if (a.length !== b.length) return false;
  return [...a].sort().join('') === [...b].sort().join('');
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const quizRes = await db.collection('quizzes').doc(event.quizId).get();
    const quiz = quizRes.data;
    if (!quiz || quiz.openid !== OPENID) {
      return { code: -1, message: '测验不存在', data: null };
    }
    if (quiz.status === 'submitted') {
      return { code: 0, message: 'success', data: { correctCount: quiz.correctCount || 0, total: quiz.count } };
    }

    const qRes = await db.collection('questions').where({ _id: _.in(quiz.questionIds) }).get();
    const qMap = {};
    qRes.data.forEach((q) => {
      qMap[q._id] = q;
    });

    const answers = event.answers || {};
    const now = new Date().toISOString();
    const today = fmtDate(new Date());
    const recordCol = db.collection('answer_records');
    const wrongCol = db.collection('wrong_questions');

    let correctCount = 0;
    const items = quiz.questionIds
      .map((id) => ({ id, q: qMap[id] }))
      .filter((x) => x.q);

    for (const { q } of items) {
      const userAnswer = answers[q._id] || [];
      const isCorrect = sameAnswer(userAnswer, q.answer || []);
      if (isCorrect) correctCount++;
      await recordCol.add({
        data: {
          openid: OPENID,
          bankId: q.bankId,
          type: q.type,
          mode: 'quiz',
          questionId: q._id,
          userAnswer: userAnswer.join(','),
          isCorrect,
          createdAt: now,
        },
      });
      if (!isCorrect) {
        const exist = await wrongCol.where({ openid: OPENID, questionId: q._id }).limit(1).get();
        if (exist.data.length > 0) {
          await wrongCol.doc(exist.data[0]._id).update({
            data: { wrongCount: _.inc(1), lastWrongAt: now, mastered: false },
          });
        } else {
          await wrongCol.add({
            data: {
              openid: OPENID,
              questionId: q._id,
              bankId: q.bankId,
              type: q.type,
              wrongCount: 1,
              lastWrongAt: now,
              mastered: false,
              createdAt: now,
            },
          });
        }
      }
    }

    await db.collection('quizzes').doc(quiz._id).update({
      data: {
        status: 'submitted',
        answers,
        correctCount,
        timeUsedSec: Number(event.timeUsedSec) || 0,
        submittedAt: now,
      },
    });

    const userRes = await db.collection('users').where({ openid: OPENID }).limit(1).get();
    if (userRes.data.length > 0) {
      const user = userRes.data[0];
      const update = {
        totalAnswered: _.inc(items.length),
        totalCorrect: _.inc(correctCount),
        quizCount: _.inc(1),
      };
      if (user.lastCheckin !== today) {
        update.checkinDates = _.addToSet(today);
        update.lastCheckin = today;
      }
      await db.collection('users').doc(user._id).update({ data: update });
    }

    return { code: 0, message: 'success', data: { correctCount, total: items.length } };
  } catch (err) {
    console.error('submitQuiz failed', err);
    return { code: -1, message: err.message || '交卷失败', data: null };
  }
};
