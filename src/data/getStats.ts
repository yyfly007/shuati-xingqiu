// mock: getStats —— 打卡与学习统计
import dayjs from 'dayjs';
import { StatsData } from '../types';
import { accuracyRate } from '../utils/format';
import { calcStreak, clone, delay, getDb } from './mock-db';

export default async (): Promise<StatsData> => {
  await delay(250);
  const db = getDb();
  const today = dayjs().format('YYYY-MM-DD');

  const todayRecords = db.records.filter((r) => dayjs(r.createdAt).format('YYYY-MM-DD') === today);
  const week: { date: string; answered: number; correct: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    const list = db.records.filter((r) => dayjs(r.createdAt).format('YYYY-MM-DD') === date);
    week.push({ date, answered: list.length, correct: list.filter((r) => r.isCorrect).length });
  }

  const monthPrefix = dayjs().format('YYYY-MM');
  const monthCheckins = db.user.checkinDates.filter((d) => d.startsWith(monthPrefix)).length;

  return clone({
    user: db.user,
    today: {
      answered: todayRecords.length,
      correct: todayRecords.filter((r) => r.isCorrect).length,
    },
    week,
    streak: calcStreak(db.user.checkinDates),
    monthCheckins,
    accuracy: accuracyRate(db.user.totalCorrect, db.user.totalAnswered),
  });
};
