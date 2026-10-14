import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import cls from 'classnames';
import dayjs from 'dayjs';
import { callFunction } from '../../services/cloud';
import { useUserStore } from '../../store/user';
import { QuestionBank, PracticeType, StatsData, WrongQuestion } from '../../types';
import { accuracyRate, greetingByHour, TYPE_LABEL } from '../../utils/format';
import styles from './practice.module.scss';

const TYPE_CARDS: { key: PracticeType; icon: string; desc: string }[] = [
  { key: 'single', icon: '📝', desc: '四选一' },
  { key: 'multi', icon: '📋', desc: '多选全对才得分' },
  { key: 'judge', icon: '⚖️', desc: '对还是错' },
  { key: 'mixed', icon: '🎲', desc: '随机组合' },
];

const PracticePage: React.FC = () => {
  const { user, refresh } = useUserStore();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [bankId, setBankId] = useState<string>('bank_official');
  const [wrongTotal, setWrongTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useDidShow(async () => {
    await refresh();
    try {
      const [s, b, w] = await Promise.all([
        callFunction<StatsData>('getStats'),
        callFunction<QuestionBank[]>('getQuestionBanks'),
        callFunction<{ total: number; list: WrongQuestion[] }>('getWrongQuestions', { limit: 1 }),
      ]);
      setStats(s);
      setBanks(b);
      setWrongTotal(w.total);
      setBankId((prev) => (b.some((x) => x._id === prev) ? prev : b[0]?._id || 'bank_official'));
    } catch (e) {
      console.error('[practice] load failed', e);
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  });

  const currentBank = banks.find((b) => b._id === bankId) || banks[0];
  const checkedInToday = Boolean(stats && stats.user.checkinDates.includes(dayjs().format('YYYY-MM-DD')));

  const startPractice = (type: PracticeType) => {
    if (!currentBank || currentBank.questionCount === 0) {
      Taro.showToast({ title: '该题库暂无题目', icon: 'none' });
      return;
    }
    Taro.navigateTo({
      url: `/pages/practice-take/practice-take?bankId=${currentBank._id}&type=${type}&count=10`,
    });
  };

  const startWrongPractice = () => {
    if (wrongTotal === 0) {
      Taro.showToast({ title: '暂无错题，先刷题吧', icon: 'none' });
      return;
    }
    Taro.navigateTo({ url: '/pages/practice-take/practice-take?mode=wrong&count=50' });
  };

  const typeCount = (t: PracticeType) => {
    if (!currentBank) return 0;
    if (t === 'mixed') return currentBank.questionCount;
    return currentBank.typeStats[t] || 0;
  };

  if (loading && !stats) {
    return (
      <View className={styles.container}>
        <View className={styles.loadingWrap}>
          <Text className={styles.loadingText}>加载中…</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.container}>
      {/* 顶部问候卡 */}
      <View className={styles.header}>
        <View className={styles.headerTop}>
          <View className={styles.headerLeft}>
            <Text className={styles.greeting}>
              {greetingByHour()}，{user?.nickname || '同学'} 👋
            </Text>
            <Text className={styles.dateText}>{dayjs().format('M月D日 · dddd')}</Text>
          </View>
          <View className={cls(styles.checkinBadge, checkedInToday ? styles.checked : styles.uncleared)}>
            <Text className={styles.checkinText}>{checkedInToday ? '✓ 已打卡' : '未打卡'}</Text>
          </View>
        </View>
        <View className={styles.todayRow}>
          <View className={styles.todayItem}>
            <Text className={styles.todayNum}>{stats?.today.answered ?? 0}</Text>
            <Text className={styles.todayLabel}>今日题数</Text>
          </View>
          <View className={styles.todayItem}>
            <Text className={styles.todayNum}>
              {accuracyRate(stats?.today.correct ?? 0, stats?.today.answered ?? 0)}%
            </Text>
            <Text className={styles.todayLabel}>今日正确率</Text>
          </View>
          <View className={styles.todayItem}>
            <Text className={cls(styles.todayNum, styles.accentNum)}>{stats?.streak ?? 0}</Text>
            <Text className={styles.todayLabel}>连续打卡</Text>
          </View>
        </View>
      </View>

      {/* 快捷入口 */}
      <View className={styles.quickRow}>
        <View className={styles.quickCard} onClick={startWrongPractice}>
          <Text className={styles.quickIcon}>📕</Text>
          <View className={styles.quickTextWrap}>
            <Text className={styles.quickTitle}>错题重练</Text>
            <Text className={styles.quickDesc}>{wrongTotal > 0 ? `待攻克 ${wrongTotal} 题` : '暂无错题'}</Text>
          </View>
          <Text className={styles.quickArrow}>›</Text>
        </View>
        <View
          className={styles.quickCard}
          onClick={() => Taro.switchTab({ url: '/pages/quiz/quiz' })}
        >
          <Text className={styles.quickIcon}>⏱️</Text>
          <View className={styles.quickTextWrap}>
            <Text className={styles.quickTitle}>限时测验</Text>
            <Text className={styles.quickDesc}>挑战你的反应力</Text>
          </View>
          <Text className={styles.quickArrow}>›</Text>
        </View>
      </View>

      {/* 按题型练习 */}
      <Text className={styles.sectionTitle}>按题型练习</Text>
      <View className={styles.typeGrid}>
        {TYPE_CARDS.map((c) => (
          <View key={c.key} className={styles.typeCard} onClick={() => startPractice(c.key)}>
            <Text className={styles.typeIcon}>{c.icon}</Text>
            <Text className={styles.typeName}>{TYPE_LABEL[c.key]}</Text>
            <Text className={styles.typeCount}>{typeCount(c.key)} 题</Text>
            <Text className={styles.typeDesc}>{c.desc}</Text>
          </View>
        ))}
      </View>

      {/* 题库选择 */}
      <Text className={styles.sectionTitle}>选择题库</Text>
      <View className={styles.bankList}>
        {banks.map((b) => (
          <View
            key={b._id}
            className={cls(styles.bankItem, b._id === bankId && styles.bankActive)}
            onClick={() => setBankId(b._id)}
          >
            <View className={styles.bankInfo}>
              <View className={styles.bankNameRow}>
                <Text className={styles.bankName}>{b.name}</Text>
                <Text className={cls(styles.bankTag, b.type === 'official' ? styles.tagOfficial : styles.tagMine)}>
                  {b.type === 'official' ? '官方' : '我的'}
                </Text>
              </View>
              <Text className={styles.bankMeta}>
                共 {b.questionCount} 题 · 单选 {b.typeStats.single} / 多选 {b.typeStats.multi} / 判断 {b.typeStats.judge}
              </Text>
            </View>
            <View
              className={cls(styles.bankRadio, b._id === bankId && styles.bankRadioOn)}
              onClick={(e) => {
                e.stopPropagation();
                startPractice('mixed');
              }}
            >
              <Text className={styles.bankRadioText}>练</Text>
            </View>
          </View>
        ))}
        {banks.length === 0 && (
          <View className={styles.bankEmpty}>
            <Text className={styles.bankEmptyText}>暂无可用题库</Text>
          </View>
        )}
      </View>

      <Text className={styles.footerTip}>完成任意练习即可自动打卡 · 数据云同步</Text>
    </View>
  );
};

export default PracticePage;
