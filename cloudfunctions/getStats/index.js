const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

function fmtDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const userRes = await db.collection('users').where({ openid: OPENID }).limit(1).get();
    if (userRes.data.length === 0) {
      return { code: -1, message: '用户不存在', data: null };
    }
    const user = userRes.data[0];
    const now = new Date();
    const today = fmtDate(now);
    const weekStart = addDays(now, -6);
    weekStart.setHours(0, 0, 0, 0);

    const recCol = db.collection('answer_records');
    const weekRes = await recCol
      .where({ openid: OPENID, createdAt: _.gte(weekStart.toISOString()) })
      .limit(1000)
      .get();

    // 按天分组（服务端返回 UTC 时间，统一转为本地日期分组）
    const dayMap = {};
    for (let i = 6; i >= 0; i--) dayMap[fmtDate(addDays(now, -i))] = { date: fmtDate(addDays(now, -i)), answered: 0, correct: 0 };
    weekRes.data.forEach((r) => {
      const key = fmtDate(new Date(r.createdAt));
      if (dayMap[key]) {
        dayMap[key].answered++;
        if (r.isCorrect) dayMap[key].correct++;
      }
    });
    const week = Object.values(dayMap);
    const today = week[6];

    // 连续打卡
    const dateSet = new Set(user.checkinDates || []);
    let streak = 0;
    let cursor = dateSet.has(fmtDate(now)) ? now : addDays(now, -1);
    while (dateSet.has(fmtDate(cursor))) {
      streak++;
      cursor = addDays(cursor, -1);
    }

    const monthPrefix = fmtDate(now).slice(0, 7);
    const monthCheckins = (user.checkinDates || []).filter((d) => d.startsWith(monthPrefix)).length;
    const accuracy =
      user.totalAnswered > 0 ? Math.round((user.totalCorrect / user.totalAnswered) * 100) : 0;

    delete user.openid;
    return {
      code: 0,
      message: 'success',
      data: {
        user,
        today: { answered: today.answered, correct: today.correct },
        week,
        streak,
        monthCheckins,
        accuracy,
      },
    };
  } catch (err) {
    console.error('getStats failed', err);
    return { code: -1, message: err.message || '获取统计失败', data: null };
  }
};
