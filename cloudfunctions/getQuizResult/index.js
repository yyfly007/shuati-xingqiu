const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const quizRes = await db.collection('quizzes').doc(event.quizId).get();
    const quiz = quizRes.data;
    if (!quiz || quiz.openid !== OPENID) {
      return { code: -1, message: '测验不存在', data: null };
    }
    const qRes = await db.collection('questions').where({ _id: _.in(quiz.questionIds) }).get();
    // 保持出题顺序
    const qMap = {};
    qRes.data.forEach((q) => {
      qMap[q._id] = q;
    });
    const questions = quiz.questionIds.map((id) => qMap[id]).filter(Boolean);
    delete quiz.openid;
    return { code: 0, message: 'success', data: { quiz, questions } };
  } catch (err) {
    console.error('getQuizResult failed', err);
    return { code: -1, message: err.message || '获取结果失败', data: null };
  }
};
