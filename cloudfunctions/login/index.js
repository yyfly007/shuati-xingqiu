const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const now = new Date().toISOString();
    const col = db.collection('users');
    const res = await col.where({ openid: OPENID }).limit(1).get();

    let user;
    if (res.data.length > 0) {
      user = res.data[0];
      const updates = {};
      if (event.nickname) updates.nickname = event.nickname;
      if (event.avatarUrl) updates.avatarUrl = event.avatarUrl;
      if (Object.keys(updates).length > 0) {
        await col.doc(user._id).update({ data: updates });
        Object.assign(user, updates);
      }
    } else {
      const add = await col.add({
        data: {
          openid: OPENID,
          nickname: event.nickname || '刷题同学',
          avatarUrl: event.avatarUrl || '',
          createdAt: now,
          totalAnswered: 0,
          totalCorrect: 0,
          quizCount: 0,
          checkinDates: [],
          lastCheckin: '',
        },
      });
      user = { _id: add._id, openid: OPENID, nickname: event.nickname || '刷题同学', avatarUrl: event.avatarUrl || '', createdAt: now, totalAnswered: 0, totalCorrect: 0, quizCount: 0, checkinDates: [], lastCheckin: '' };
    }
    delete user.openid;
    return { code: 0, message: 'success', data: user };
  } catch (err) {
    console.error('login failed', err);
    return { code: -1, message: err.message || '登录失败', data: null };
  }
};
