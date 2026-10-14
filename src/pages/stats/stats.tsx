import React, { useMemo, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import cls from 'classnames';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { callFunction } from '../../services/cloud';
import { StatsData } from '../../types';
import { accuracyRate, todayStr } from '../../utils/format';
import EmptyState from '../../components/EmptyState/EmptyState';
import styles from './stats.module.scss';

dayjs.locale('zh-cn');

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

const StatsPage: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useDidShow(async () => {
    setLoading(true);
    try {
      const s = await callFunction<StatsData>('getStats');
      setStats(s);
    } catch (e) {
      console.error('[stats] load failed', e);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  });

  // 本月日历
  const calendar = useMemo(() => {
    const now = dayjs();
    const daysInMonth = now.daysInMonth();
    const startWeekday = now.startOf('month').day();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return {
      cells,
      monthLabel: now.format('YYYY年M月'),
      prefix: now.format('YYYY-MM'),
    };
  }, []);

  const dayKey = (d: number) => `${calendar.prefix}-${String(d).padStart(2, '0')}`;

  const checkinSet = useMemo(() => new Set(stats?.user.checkinDates || []), [stats]);
  const today = todayStr();
  const maxWeek = Math.max(1, ...(stats?.week.map((w) => w.answered) || [1]));

  if (loading && !stats) {
    return (
      <View className={styles.container}>
        <View className={styles.center}>
          <Text className={styles.loadingText}>统计加载中…</Text>
        </View>
      </View>
    );
  }

  if (!stats) {
    return (
      <View className={styles.container}>
        <View className={styles.center}>
          <EmptyState icon="📊" title="统计数据加载失败" desc="请下拉或返回重试" />
        </View>
      </View>
    );
  }

  const checkedInToday = checkinSet.has(today);
  const weekLabelOf = (date: string) => WEEK_LABELS[dayjs(date).day()];

  return (
    <View className={styles.container}>
      {/* 打卡日历 */}
      <View className={styles.card}>
        <View className={styles.cardHead}>
          <Text className={styles.cardTitle}>本月打卡</Text>
          <Text className={styles.cardSub}>{calendar.monthLabel} · 已打卡 {stats.monthCheckins} 天</Text>
        </View>
        <View className={styles.weekHead}>
          {WEEK_LABELS.map((w) => (
            <Text key={w} className={styles.weekCell}>{w}</Text>
          ))}
        </View>
        <View className={styles.calGrid}>
          {calendar.cells.map((d, i) =>
            d === null ? (
              <View key={`e${i}`} className={styles.calCell}>
                <View />
              </View>
            ) : (
              <View key={d} className={styles.calCell}>
                <View
                  className={cls(
                    styles.calDay,
                    checkinSet.has(dayKey(d)) && styles.calDayChecked,
                    dayKey(d) === today && styles.calDayToday
                  )}
                >
                  <Text className={cls(styles.calDayText, checkinSet.has(dayKey(d)) && styles.calDayCheckedText)}>
                    {d}
                  </Text>
                </View>
              </View>
            )
          )}
        </View>
        <View className={styles.calLegend}>
          <View className={styles.legendItem}>
            <View className={cls(styles.legendDot, styles.legendDotChecked)} />
            <Text className={styles.legendText}>已打卡</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={cls(styles.legendDot, styles.legendDotToday)} />
            <Text className={styles.legendText}>今天</Text>
          </View>
        </View>
      </View>

      {/* 今日 */}
      <View className={cls(styles.todayCard, checkedInToday && styles.todayCardDone)}>
        <View className={styles.todayLeft}>
          <Text className={styles.todayTitle}>{checkedInToday ? '✓ 今日已打卡' : '今日还未打卡'}</Text>
          <Text className={styles.todayDesc}>
            {stats.today.answered > 0
              ? `已答 ${stats.today.answered} 题 · 正确 ${stats.today.correct} 题`
              : '完成任意练习或测验即可打卡'}
          </Text>
        </View>
        {!checkedInToday && (
          <View
            className={styles.todayBtn}
            onClick={() => Taro.switchTab({ url: '/pages/practice/practice' })}
          >
            <Text className={styles.todayBtnText}>去刷题</Text>
          </View>
        )}
      </View>

      {/* 指标 */}
      <View className={styles.tiles}>
        <View className={styles.tile}>
          <Text className={styles.tileNum}>{stats.user.totalAnswered}</Text>
          <Text className={styles.tileLabel}>累计刷题</Text>
        </View>
        <View className={styles.tile}>
          <Text className={styles.tileNum}>{stats.user.quizCount}</Text>
          <Text className={styles.tileLabel}>测验次数</Text>
        </View>
        <View className={styles.tile}>
          <Text className={styles.tileNum}>{stats.accuracy}%</Text>
          <Text className={styles.tileLabel}>总正确率</Text>
        </View>
        <View className={styles.tile}>
          <Text className={cls(styles.tileNum, styles.tileAccent)}>{stats.streak}</Text>
          <Text className={styles.tileLabel}>连续打卡</Text>
        </View>
      </View>

      {/* 近 7 日 */}
      <View className={styles.card}>
        <View className={styles.cardHead}>
          <Text className={styles.cardTitle}>近 7 日答题</Text>
          <Text className={styles.cardSub}>
            共 {stats.week.reduce((s, w) => s + w.answered, 0)} 题 · 正确率 {accuracyRate(stats.week.reduce((s, w) => s + w.correct, 0), stats.week.reduce((s, w) => s + w.answered, 0))}%
          </Text>
        </View>
        <View className={styles.chart}>
          {stats.week.map((w) => (
            <View key={w.date} className={styles.chartCol}>
              <View className={styles.chartBarArea}>
                <View
                  className={cls(styles.chartBar, w.answered > 0 && styles.chartBarFull)}
                  style={{ height: `${Math.max(6, (w.answered / maxWeek) * 100)}%` }}
                />
              </View>
              <Text className={cls(styles.chartLabel, w.date === today && styles.chartLabelToday)}>
                {weekLabelOf(w.date)}
              </Text>
              <Text className={styles.chartNum}>{w.answered}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default StatsPage;
