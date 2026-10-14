import React, { useCallback, useRef, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import cls from 'classnames';
import { callFunction } from '../../services/cloud';
import { Question } from '../../types';
import { accuracyRate, encouragement, sameAnswer, TYPE_LABEL } from '../../utils/format';
import QuestionCard from '../../components/QuestionCard/QuestionCard';
import EmptyState from '../../components/EmptyState/EmptyState';
import styles from './practice-take.module.scss';

interface ResultItem {
  questionId: string;
  bankId: string;
  type: string;
  userAnswer: string[];
  isCorrect: boolean;
}

const PracticeTakePage: React.FC = () => {
  const [params, setParams] = useState({ bankId: 'bank_official', type: 'mixed', count: 10, mode: 'practice' });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'taking' | 'done' | 'empty'>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState({ correctCount: 0, totalCount: 0 });
  const resultsRef = useRef<ResultItem[]>([]);

  const isWrongMode = params.mode === 'wrong';

  const loadQuestions = useCallback(async (p = params) => {
    setPhase('loading');
    try {
      const list = await callFunction<Question[]>('getQuestions', {
        bankId: p.bankId,
        type: p.type,
        count: p.count,
        mode: p.mode,
      });
      if (!list || list.length === 0) {
        setPhase('empty');
        return;
      }
      setQuestions(list);
      setIndex(0);
      setSelected([]);
      setChecked(false);
      resultsRef.current = [];
      setPhase('taking');
    } catch (e) {
      console.error('[practice-take] load failed', e);
      Taro.showToast({ title: '取题失败，请重试', icon: 'none' });
      setPhase('empty');
    }
  }, [params]);

  useLoad((opts) => {
    const p = {
      bankId: opts?.bankId || 'bank_official',
      type: opts?.type || 'mixed',
      count: Number(opts?.count) || 10,
      mode: opts?.mode === 'wrong' ? 'wrong' : 'practice',
    };
    setParams(p);
    if (p.mode === 'wrong') {
      Taro.setNavigationBarTitle({ title: '错题重练' });
    } else {
      Taro.setNavigationBarTitle({ title: TYPE_LABEL[p.type as keyof typeof TYPE_LABEL] || '练习' });
    }
    loadQuestions(p);
  });

  const onBack = () => {
    Taro.showModal({
      title: '退出练习',
      content: '当前进度不会保存，确定退出吗？',
      confirmText: '退出',
      cancelText: '继续',
      success: (res) => {
        if (res.confirm) Taro.navigateBack({ fail: () => Taro.switchTab({ url: '/pages/practice/practice' }) });
      },
    });
  };

  const onOptionTap = (letter: string) => {
    if (checked) return;
    const q = questions[index];
    if (!q) return;
    if (q.type === 'multi') {
      setSelected((prev) => (prev.includes(letter) ? prev.filter((x) => x !== letter) : [...prev, letter]));
    } else {
      setSelected([letter]);
    }
  };

  const onConfirm = () => {
    const q = questions[index];
    if (!q || selected.length === 0) return;
    const isCorrect = sameAnswer(selected, q.answer);
    setLastCorrect(isCorrect);
    resultsRef.current.push({
      questionId: q._id,
      bankId: q.bankId,
      type: q.type,
      userAnswer: selected,
      isCorrect,
    });
    setChecked(true);
  };

  const finish = async () => {
    setSubmitting(true);
    try {
      const summary = await callFunction<{ correctCount: number; totalCount: number }>('submitPractice', {
        items: resultsRef.current,
        mode: 'practice',
      });
      setDone(summary);
      setPhase('done');
    } catch (e) {
      console.error('[practice-take] submit failed', e);
      Taro.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const onNext = () => {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setSelected([]);
      setChecked(false);
    } else {
      finish();
    }
  };

  // ---------- 渲染 ----------
  if (phase === 'loading') {
    return (
      <View className={styles.wrap}>
        <View className={styles.center}>
          <Text className={styles.loadingText}>正在取题…</Text>
        </View>
      </View>
    );
  }

  if (phase === 'empty') {
    return (
      <View className={styles.wrap}>
        <View className={styles.center}>
          <EmptyState
            icon={isWrongMode ? '🎉' : '📭'}
            title={isWrongMode ? '太棒了，没有待练的错题' : '暂无题目'}
            desc={isWrongMode ? '继续保持，去刷点新题吧' : '该题库下没有对应题型的题目'}
            actionText="返回练习"
            onAction={() => Taro.switchTab({ url: '/pages/practice/practice' })}
          />
        </View>
      </View>
    );
  }

  if (phase === 'done') {
    const rate = accuracyRate(done.correctCount, done.totalCount);
    return (
      <View className={styles.wrap}>
        <View className={styles.doneCard}>
          <Text className={styles.doneEmoji}>{rate >= 75 ? '🏆' : rate >= 60 ? '💪' : '📚'}</Text>
          <Text className={styles.doneTitle}>练习完成！</Text>
          <View className={styles.doneScore}>
            <Text className={styles.doneRate}>{rate}%</Text>
            <Text className={styles.doneRateLabel}>正确率</Text>
          </View>
          <Text className={styles.doneDetail}>
            共 {done.totalCount} 题 · 答对 {done.correctCount} 题 · 答错 {done.totalCount - done.correctCount} 题
          </Text>
          <Text className={styles.doneTip}>{encouragement(rate)}</Text>
          <Text className={styles.doneCheckin}>✓ 已完成今日打卡</Text>
          <View className={styles.doneBtns}>
            <View className={cls(styles.btn, styles.btnGhost)} onClick={() => loadQuestions()}>
              <Text className={cls(styles.btnText, styles.btnGhostText)}>再练一次</Text>
            </View>
            <View
              className={cls(styles.btn, styles.btnPrimary)}
              onClick={() => Taro.switchTab({ url: '/pages/wrong/wrong' })}
            >
              <Text className={styles.btnText}>查看错题</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const q = questions[index];
  if (!q) return null;

  return (
    <View className={styles.wrap}>
      {/* 进度区 */}
      <View className={styles.progressRow}>
        <Text className={styles.backBtn} onClick={onBack}>
          ✕ 退出
        </Text>
        <View className={styles.progressInfo}>
          <Text className={styles.progressText}>
            {index + 1} / {questions.length}
          </Text>
          <Text className={styles.progressType}>{TYPE_LABEL[q.type]}</Text>
        </View>
      </View>
      <View className={styles.progressBar}>
        <View className={styles.progressInner} style={{ width: `${((index + (checked ? 1 : 0)) / questions.length) * 100}%` }} />
      </View>

      {/* 题目 */}
      <QuestionCard question={q} selected={selected} status={checked ? 'checked' : 'idle'} onOptionTap={onOptionTap} />

      {/* 底部操作 */}
      <View className={styles.footer}>
        {!checked ? (
          <View
            className={cls(styles.mainBtn, selected.length === 0 && styles.mainBtnDisabled)}
            onClick={onConfirm}
          >
            <Text className={styles.mainBtnText}>确认答案</Text>
          </View>
        ) : (
          <View className={cls(styles.mainBtn, lastCorrect ? styles.mainBtnOk : styles.mainBtnNo)}>
            <Text className={styles.mainBtnText}>{lastCorrect ? '✓ 回答正确' : '✕ 回答错误'}</Text>
          </View>
        )}
        {checked && (
          <View className={styles.mainBtn} onClick={onNext}>
            <Text className={styles.mainBtnText}>{submitting ? '提交中…' : index + 1 < questions.length ? '下一题' : '查看结果'}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default PracticeTakePage;
