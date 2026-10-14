// mock: login —— 静默登录，返回用户信息
import { User } from '../types';
import { clone, commit, delay, getDb, nowIso } from './mock-db';

export default async (data?: any): Promise<User> => {
  await delay(200);
  const db = getDb();
  if (data?.nickname) db.user.nickname = data.nickname;
  if (data?.avatarUrl) db.user.avatarUrl = data.avatarUrl;
  if (!db.user.createdAt || db.user.createdAt === '0') db.user.createdAt = nowIso();
  commit();
  return clone(db.user);
};
