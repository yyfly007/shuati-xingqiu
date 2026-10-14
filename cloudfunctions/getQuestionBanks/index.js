const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const [official, mine] = await Promise.all([
      db.collection('question_banks').where({ type: 'official' }).get(),
      db.collection('question_banks').where({ type: 'user', openid: OPENID }).get(),
    ]);
    const banks = [...official.data, ...mine.data];
    const ids = banks.map((b) => b._id);

    let typeStats = [];
    if (ids.length > 0) {
      const agg = await db
        .collection('questions')
        .aggregate()
        .match({ bankId: _.in(ids) })
        .group({ _id: { bankId: '$bankId', type: '$type' }, count: $.sum(1) })
        .end();
      typeStats = agg.list || [];
    }

    const data = banks.map((b) => {
      const related = typeStats.filter((t) => t._id && t._id.bankId === b._id);
      const stats = { single: 0, multi: 0, judge: 0 };
      related.forEach((t) => {
        const type = t._id.type;
        if (stats[type] !== undefined) stats[type] += t.count;
      });
      return {
        _id: b._id,
        type: b.type,
        name: b.name,
        createdAt: b.createdAt,
        questionCount: related.reduce((s, t) => s + t.count, 0),
        typeStats: stats,
      };
    });
    return { code: 0, message: 'success', data };
  } catch (err) {
    console.error('getQuestionBanks failed', err);
    return { code: -1, message: err.message || '获取题库失败', data: null };
  }
};
