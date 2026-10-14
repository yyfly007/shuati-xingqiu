import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import cls from 'classnames';
import { callFunction } from '../../services/cloud';
import { QuestionBank, PracticeType } from '../../types';
import { formatClock, TYPE_LABEL, TYPE_SHORT } from '../../utils/format';
import styles from './quiz.module.scss';

const TYPE_OPTIONS: PracticeType[] = ['mixed', 'single', 'multi', 'judge'];
const COUNT_OPTIONS = [10, 15, 20];
const DURATION_OPTIONS = [120, 300, 600, 600 * 5];

const QuizPage: React.FC = () => {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [bankId, setBankId] = useState('bank_official');
  const [type, setType] = useState<PracticeType>('mixed');
  const [count, setCount] = useState(10);
  const [duration, setDuration] = useState(300);
  const [starting, setStarting] = useState(false);

  useDidShow(async () => {
    try {
      const list = await callFunction<QuestionBank[]>('getQuestionBanks');
      setBanks(list);
      setBankId((prev) => (list.some((b) => b._id === prev) ? prev : list[0]?._id || 'bank_official'));
    } catch (e) {
      console.error('[quiz] load banks failed', e);
    }
  });

  const currentBank = banks.find((b) => b._id === bankId);
  const availableCount = currentBank
    ? type === 'mixed'
      ? currentBank.questionCount
      : currentBank.typeStats[type] || 0
    : 0;

  const startQuiz = async () => {
    if (!currentBank || currentBank.questionCount === 0) {
      Taro.showToast({ title: '请先导入题目', icon: 'none' });
      return;
    }
    if (availableCount === 0) {
      Taro.showToast({ title: `该题库没有${TYPE_SHORT[type]}题`, icon: 'none' });
      return;
    }
    setStarting(true);
    try {
      const res = await callFunction<{ quizId: string; count: number }>('createQuiz', {
        bankId,
        type,
        count: Math.min(count, availableCount),
        durationSec: duration,
      });
      Taro.navigateTo({ url: `/pages/quiz-take/quiz-take?quizId=${res.quizId}` });
    } catch (e) {
      console.error('[quiz] create failed', e);
      Taro.showToast({ title: '创建测验失败，请重试', icon: 'none' });
    } finally {
      setStarting(false);
    }
  };

  return (
    <View className={styles.container}>
      {/* 规则卡 */}
      <View className={styles.rulesCard}>
        <Text className={styles.rulesIcon}>⏱️</Text>
        <View className={styles.rulesTextWrap}>
          <Text className={styles.rulesTitle}>限时挑战</Text>
          <Text className={styles.rulesDesc}>倒计时结束自动交卷 · 未答题目按错误计分 · 答错自动进错题本</Text>
        </View>
      </View>

      {/* 题库选择 */}
      <Text className={styles.sectionTitle}>选择题库</Text>
      <View className={styles.chipRow}>
        {banks.map((b) => (
          <View
            key={b._id}
            className={cls(styles.chip, b._id === bankId && styles.chipActive)}
            onClick={() => setBankId(b._id)}
          >
            <Text className={cls(styles.chipText, b._id === bankId && styles.chipTextActive)}>
              {b.name}（{b.questionCount}）
            </Text>
          </View>
        ))}
      </View>

      {/* 题型 */}
      <Text className={styles.sectionTitle}>题型</Text>
      <View className={styles.typeGrid}>
        {TYPE_OPTIONS.map((t) => (
          <View key={t} className={cls(styles.typeItem, t === type && styles.typeItemActive)} onClick={() => setType(t)}>
            <Text className={cls(styles.typeItemName, t === type && styles.typeItemNameActive)}>
              {TYPE_LABEL[t]}
            </Text>
            <Text className={styles.typeItemCount}>
              {t === 'mixed' ? availableCount : currentBank?.typeStats[t] || 0} 题
            </Text>
          </View>
        ))}
      </View>

      {/* 题量 */}
      <Text className={styles.sectionTitle}>题量</Text>
      <View className={styles.chipRow}>
        {COUNT_OPTIONS.map((c) => (
          <View key={c} className={cls(styles.chip, c === count && styles.chipActive)} onClick={() => setCount(c)}>
            <Text className={cls(styles.chipText, c === count && styles.chipTextActive)}>{c} 题</Text>
          </View>
        ))}
      </View>

      {/* 时长 */}
      <Text className={styles.sectionTitle}>限时</Text>
      <View className={styles.chipRow}>
        {DURATION_OPTIONS.map((d) => (
          <View key={d} className={cls(styles.chip, d === duration && styles.chipActive)} onClick={() => setDuration(d)}>
            <Text className={cls(styles.chipText, d === duration && styles.chipTextActive)}>
              {d >= 600 ? `${d / 60} 分钟` : formatClock(d)}
            </Text>
          </View>
        ))}
      </View>

      {/* 信息汇总 */}
      <View className={styles.summary}>
        <Text className={styles.summaryText}>
          {currentBank?.name || '官方题库'} · {TYPE_LABEL[type]} · {Math.min(count, availableCount)} 题 · 限时 {duration >= 600 ? `${duration / 60} 分钟` : formatClock(duration)}
        </Text>
      </View>

      <View className={styles.startWrap}>
        <View className={cls(styles.startBtn, starting && styles.startBtnDisabled)} onClick={startQuiz}>
          <Text className={styles.startBtnText}>{starting ? '出题中…' : '开始测验'}</Text>
        </View>
      </View>
    </View>
  );
};

export default QuizPage;
