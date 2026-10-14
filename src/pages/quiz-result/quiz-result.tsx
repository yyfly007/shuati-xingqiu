import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import cls from 'classnames';
import { callFunction } from '../../services/cloud';
import { Question, Quiz } from '../../types';
import { accuracyRate, encouragement, formatClock, sameAnswer, TYPE_LABEL } from '../../utils/format';
import QuestionCard from '../../components/QuestionCard/QuestionCard';
import EmptyState from '../../components/EmptyState/EmptyState';
import styles from './quiz-result.module.scss';

const QuizResultPage: React.FC = () => {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'notSubmitted' | 'error'>('loading');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [retrying, setRetrying] = useState(false);

  const quizId = (() => {
    const res = Taro.getCurrentInstance().router?.params;
    return res?.quizId || '';
  })();

  useLoad(async () => {
    if (!quizId) {
      setPhase('error');
      return;
    }
    try {
      const data = await callFunction<{ quiz: Quiz; questions: Question[] }>('getQuizResult', { quizId });
      setQuiz(data.quiz);
      setQuestions(data.questions);
      setPhase(data.quiz.status === 'submitted' ? 'ready' : 'notSubmitted');
    } catch (e) {
      console.error('[quiz-result] load failed', e);
      setPhase('error');
    }
  });

  const retry = async () => {
    if (!quiz || retrying) return;
    setRetrying(true);
    try {
      const res = await callFunction<{ quizId: string }>('createQuiz', {
        bankId: quiz.bankId,
        type: quiz.type,
        count: quiz.count,
        durationSec: quiz.durationSec,
      });
      Taro.redirectTo({ url: `/pages/quiz-take/quiz-take?quizId=${res.quizId}` });
    } catch (e) {
      console.error('[quiz-result] retry failed', e);
      Taro.showToast({ title: '重新出题失败', icon: 'none' });
      setRetrying(false);
    }
  };

  if (phase === 'loading') {
    return (
      <View className={styles.wrap}>
        <View className={styles.center}>
          <Text className={styles.loadingText}>正在统计成绩…</Text>
        </View>
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View className={styles.wrap}>
        <View className={styles.center}>
          <EmptyState icon="📄" title="结果加载失败" desc="请返回重新测验" actionText="返回测验" onAction={() => Taro.switchTab({ url: '/pages/quiz/quiz' })} />
        </View>
      </View>
    );
  }

  if (phase === 'notSubmitted' || !quiz) {
    return (
      <View className={styles.wrap}>
        <View className={styles.center}>
          <EmptyState
            icon="⏳"
            title="该测验尚未交卷"
            desc="返回继续作答吧"
            actionText="继续作答"
            onAction={() => Taro.redirectTo({ url: `/pages/quiz-take/quiz-take?quizId=${quizId}` })}
          />
        </View>
      </View>
    );
  }

  const total = quiz.count;
  const correct = quiz.correctCount || 0;
  const rate = accuracyRate(correct, total);
  const wrongList = questions.filter((q) => !sameAnswer(quiz.answers?.[q._id] || [], q.answer));

  return (
    <View className={styles.wrap}>
      {/* 成绩卡 */}
      <View className={styles.scoreCard}>
        <Text className={styles.scoreEmoji}>{rate >= 90 ? '🏆' : rate >= 75 ? '🎉' : rate >= 60 ? '💪' : '📚'}</Text>
        <View className={styles.scoreRow}>
          <Text className={styles.scoreRate}>{rate}</Text>
          <Text className={styles.scoreUnit}>%</Text>
        </View>
        <Text className={styles.scoreLabel}>正确率 · {encouragement(rate)}</Text>
        <View className={styles.scoreMeta}>
          <View className={styles.metaItem}>
            <Text className={styles.metaNum}>{total}</Text>
            <Text className={styles.metaLabel}>总题数</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaNum}>{correct}</Text>
            <Text className={styles.metaLabel}>答对</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaNum}>{total - correct}</Text>
            <Text className={styles.metaLabel}>答错</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaNum}>{formatClock(quiz.timeUsedSec || 0)}</Text>
            <Text className={styles.metaLabel}>用时</Text>
          </View>
        </View>
      </View>

      {/* 错题回顾 */}
      {wrongList.length > 0 ? (
        <>
          <Text className={styles.sectionTitle}>错题回顾（{wrongList.length}）</Text>
          <View className={styles.wrongList}>
            {wrongList.map((q) => (
              <QuestionCard key={q._id} question={q} selected={quiz.answers?.[q._id] || []} status="checked" />
            ))}
          </View>
        </>
      ) : (
        <View className={styles.perfect}>
          <Text className={styles.perfectText}>🎊 全部答对，太厉害了！</Text>
        </View>
      )}

      {/* 操作 */}
      <View className={styles.actions}>
        <View className={cls(styles.actionBtn, styles.actionGhost)} onClick={retry}>
          <Text className={styles.actionGhostText}>{retrying ? '出题中…' : '再来一次'}</Text>
        </View>
        <View
          className={styles.actionBtn}
          onClick={() => Taro.switchTab({ url: '/pages/wrong/wrong' })}
        >
          <Text className={styles.actionPrimaryText}>查看错题本</Text>
        </View>
      </View>

      <Text className={styles.typeLine}>本次测验：{TYPE_LABEL[quiz.type]} · 限时 {formatClock(quiz.durationSec)}</Text>
    </View>
  );
};

export default QuizResultPage;
