import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useLoad, useUnload } from '@tarojs/taro';
import cls from 'classnames';
import { callFunction } from '../../services/cloud';
import { Question, Quiz } from '../../types';
import { formatClock, TYPE_LABEL } from '../../utils/format';
import QuestionCard from '../../components/QuestionCard/QuestionCard';
import EmptyState from '../../components/EmptyState/EmptyState';
import styles from './quiz-take.module.scss';

const QuizTakePage: React.FC = () => {
  const [phase, setPhase] = useState<'loading' | 'taking' | 'error'>('loading');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);
  const quizIdRef = useRef('');

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const doSubmit = useCallback(async (auto: boolean) => {
    if (submittingRef.current || !quizIdRef.current) return;
    submittingRef.current = true;
    clearTimer();
    try {
      const timeUsed = quiz ? quiz.durationSec - remaining : 0;
      await callFunction('submitQuiz', {
        quizId: quizIdRef.current,
        answers,
        timeUsedSec: Math.max(0, timeUsed),
      });
      Taro.redirectTo({ url: `/pages/quiz-result/quiz-result?quizId=${quizIdRef.current}` });
    } catch (e) {
      console.error('[quiz-take] submit failed', e);
      Taro.showToast({ title: auto ? '自动交卷失败' : '交卷失败，请重试', icon: 'none' });
      submittingRef.current = false;
    }
  }, [answers, quiz, remaining]);

  const load = useCallback(async (id: string) => {
    setPhase('loading');
    try {
      const res = await callFunction<{ quiz: Quiz; questions: Question[] }>('getQuizResult', { quizId: id });
      if (res.quiz.status === 'submitted') {
        Taro.redirectTo({ url: `/pages/quiz-result/quiz-result?quizId=${id}` });
        return;
      }
      setQuiz(res.quiz);
      setQuestions(res.questions);
      setIndex(0);
      setAnswers({});
      setRemaining(res.quiz.durationSec);
      setPhase('taking');
      clearTimer();
      timerRef.current = setInterval(() => {
        setRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
    } catch (e) {
      console.error('[quiz-take] load failed', e);
      setPhase('error');
    }
  }, []);

  // 用 ref 保持 doSubmit 最新
  const doSubmitRef = useRef(doSubmit);
  doSubmitRef.current = doSubmit;

  // 倒计时归零自动交卷
  useEffect(() => {
    if (phase === 'taking' && remaining <= 0) {
      doSubmitRef.current(true);
    }
  }, [remaining, phase]);

  useLoad((opts) => {
    const id = opts?.quizId;
    if (!id) {
      setPhase('error');
      return;
    }
    quizIdRef.current = id;
    load(id);
  });

  useUnload(() => clearTimer());

  const q = questions[index];

  const onOptionTap = (letter: string) => {
    if (!q) return;
    setAnswers((prev) => {
      const cur = prev[q._id] || [];
      let next: string[];
      if (q.type === 'multi') {
        next = cur.includes(letter) ? cur.filter((x) => x !== letter) : [...cur, letter];
      } else {
        next = [letter];
      }
      return { ...prev, [q._id]: next };
    });
  };

  const answeredCount = questions.filter((x) => (answers[x._id] || []).length > 0).length;

  const onSubmitTap = () => {
    const unanswered = questions.length - answeredCount;
    if (unanswered > 0) {
      Taro.showModal({
        title: '确认交卷',
        content: `还有 ${unanswered} 题未作答，未答按错误计分，确定交卷吗？`,
        confirmText: '交卷',
        cancelText: '继续答题',
        success: (res) => {
          if (res.confirm) doSubmit(false);
        },
      });
    } else {
      doSubmit(false);
    }
  };

  if (phase === 'loading') {
    return (
      <View className={styles.wrap}>
        <View className={styles.center}>
          <Text className={styles.loadingText}>正在准备试卷…</Text>
        </View>
      </View>
    );
  }

  if (phase === 'error' || !q) {
    return (
      <View className={styles.wrap}>
        <View className={styles.center}>
          <EmptyState
            icon="📄"
            title="试卷加载失败"
            desc="请返回重新创建测验"
            actionText="返回测验"
            onAction={() => Taro.switchTab({ url: '/pages/quiz/quiz' })}
          />
        </View>
      </View>
    );
  }

  const urgent = remaining <= 30;

  return (
    <View className={styles.wrap}>
      {/* 顶栏：倒计时 + 进度 */}
      <View className={styles.topBar}>
        <View className={cls(styles.timer, urgent && styles.timerUrgent)}>
          <Text className={styles.timerText}>{formatClock(remaining)}</Text>
        </View>
        <Text className={styles.progressText}>
          第 {index + 1} / {questions.length} 题 · 已答 {answeredCount}
        </Text>
      </View>

      {/* 题目导航 */}
      <ScrollView scrollX className={styles.navScroll} scrollIntoView={`nav-${index}`} scrollWithAnimation>
        <View className={styles.navRow}>
          {questions.map((x, i) => (
            <View
              id={`nav-${i}`}
              key={x._id}
              className={cls(
                styles.navItem,
                i === index && styles.navItemActive,
                (answers[x._id] || []).length > 0 && styles.navItemDone
              )}
              onClick={() => setIndex(i)}
            >
              <Text className={styles.navItemText}>{i + 1}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 题目 */}
      <QuestionCard question={q} selected={answers[q._id] || []} onOptionTap={onOptionTap} />

      {/* 底部操作 */}
      <View className={styles.footer}>
        <View
          className={cls(styles.sideBtn, index === 0 && styles.sideBtnDisabled)}
          onClick={() => index > 0 && setIndex((i) => i - 1)}
        >
          <Text className={styles.sideBtnText}>上一题</Text>
        </View>
        {index + 1 < questions.length ? (
          <View className={styles.sideBtn} onClick={() => setIndex((i) => i + 1)}>
            <Text className={styles.sideBtnText}>下一题</Text>
          </View>
        ) : (
          <View className={styles.submitBtn} onClick={onSubmitTap}>
            <Text className={styles.submitBtnText}>交卷</Text>
          </View>
        )}
      </View>

      {/* 题型提示 */}
      <Text className={styles.typeHint}>{TYPE_LABEL[q.type]} · {q.type === 'multi' ? '可选多个' : '单选'}</Text>
    </View>
  );
};

export default QuizTakePage;
